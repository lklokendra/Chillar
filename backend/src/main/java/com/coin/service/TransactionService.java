package com.coin.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.coin.entity.Category;
import com.coin.entity.Transaction;
import com.coin.entity.User;
import com.coin.repository.CategoryRepository;
import com.coin.repository.TransactionRepository;
import com.coin.util.ArithmeticEvaluator;

/**
 * Turns a single free-text entry such as "100 chai #office" into a stored
 * transaction. Numbers become the amount, words become the note and any
 * "#tag" picks the khata (category).
 *
 * <p>Amounts may be written as arithmetic ("100+50*2", "(500-100)/2"), which is
 * worked out by {@link ArithmeticEvaluator}. Every entry must resolve to a
 * value greater than zero.
 */
@Service
public class TransactionService {

    private static final String DEFAULT_CATEGORY = "daily";
    private static final String[] CATEGORY_COLORS = {"mint", "yellow", "blue", "rose"};
    private static final String MISSING_AMOUNT = "Please enter a spending amount before adding this expense.";

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;

    public TransactionService(TransactionRepository transactionRepository, CategoryRepository categoryRepository) {
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional
    public Transaction processEntry(User user, String input, LocalDate date) {
        ParsedEntry parsed = parse(input);
        Category category = findOrCreateCategory(user, parsed.categoryName());

        Transaction transaction = new Transaction();
        transaction.setUser(user);
        transaction.setAmount(parsed.amount());
        transaction.setNote(parsed.note().isEmpty() ? null : parsed.note());
        transaction.setCategory(category);
        transaction.setDate(date == null ? LocalDate.now() : date);

        return transactionRepository.save(transaction);
    }

    /**
     * Reads the entry text without touching the database. Also used to preview
     * the amount in the UI, so the validation message stays in one place.
     */
    public ParsedEntry parse(String input) {
        String raw = input == null ? "" : input.trim();
        if (raw.isEmpty()) {
            throw new IllegalArgumentException("Nothing to log. Try: 100 chai #office");
        }

        String categoryName = null;
        List<String> noteWords = new ArrayList<>();
        List<BigDecimal> amounts = new ArrayList<>();
        StringBuilder expression = new StringBuilder();

        for (String token : raw.split("\\s+")) {
            if (token.isEmpty()) {
                continue;
            }

            if (token.startsWith("#")) {
                String name = token.substring(1).replaceAll("[^\\p{Alnum}_-]", "");
                if (!name.isEmpty() && categoryName == null) {
                    categoryName = name;
                }
                continue;
            }

            if (isNumberish(token)) {
                expression.append(token);
                continue;
            }

            // "100 + 50" arrives as three tokens: keep the operator attached.
            if (expression.length() > 0 && isOperatorish(token)) {
                expression.append(token);
                continue;
            }

            flushExpression(expression, amounts);
            noteWords.add(token);
        }
        flushExpression(expression, amounts);

        BigDecimal amount = amounts.stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException(MISSING_AMOUNT);
        }

        return new ParsedEntry(amount, String.join(" ", noteWords), categoryName, MISSING_AMOUNT);
    }

    /** A token that belongs to a sum, e.g. "100", "1,000.50" or "(50+20)". */
    private static boolean isNumberish(String token) {
        return token.matches("[0-9+\\-*/().,]+") && token.chars().anyMatch(Character::isDigit);
    }

    /** A bare operator or bracket, e.g. "+", "-", "*" or "(", that joins a sum. */
    private static boolean isOperatorish(String token) {
        return token.matches("[+\\-*/()]+");
    }

    /**
     * Works out whatever has been collected so far and appends it to the totals.
     * A trailing operator ("100+" from "100 + tea") is trimmed first so a stray
     * plus in the middle of a sentence never breaks the entry.
     */
    private static void flushExpression(StringBuilder expression, List<BigDecimal> amounts) {
        if (expression.length() == 0) {
            return;
        }

        String candidate = expression.toString();
        expression.setLength(0);

        String cleaned = candidate.replace(",", "")
                .replaceAll("[+\\-*/.,]+$", "")
                .replaceAll("^[*/]+", "");

        if (cleaned.isEmpty() || cleaned.chars().noneMatch(Character::isDigit)) {
            return;
        }

        amounts.add(ArithmeticEvaluator.evaluate(cleaned));
    }

    private Category findOrCreateCategory(User user, String name) {
        String slug = name.toLowerCase();
        return categoryRepository.findByUserAndNameIgnoreCase(user, slug)
                .orElseGet(() -> {
                    Category newCat = new Category();
                    newCat.setUser(user);
                    newCat.setName(slug);
                    newCat.setColor(CATEGORY_COLORS[(int) (categoryRepository.count() % CATEGORY_COLORS.length)]);
                    return categoryRepository.save(newCat);
                });
    }

    /** Outcome of reading an entry: what it costs, what it says and its khata. */
    public record ParsedEntry(BigDecimal amount, String note, String categoryName, String validationMessage) {
    }
}
