package com.coin.service;

import java.math.BigDecimal;
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

/**
 * Turns a single free-text entry such as "100 chai #office" into a stored
 * transaction. Numbers become the amount, words become the note and any
 * "#tag" picks the khata (category).
 */
@Service
public class TransactionService {

    private static final String DEFAULT_CATEGORY = "daily";
    private static final String[] CATEGORY_COLORS = {"mint", "yellow", "blue", "rose"};

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;

    public TransactionService(TransactionRepository transactionRepository, CategoryRepository categoryRepository) {
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional
    public Transaction processEntry(User user, String input, LocalDate date) {
        String raw = input == null ? "" : input.trim();
        if (raw.isEmpty()) {
            throw new IllegalArgumentException("Nothing to log. Try: 100 chai #office");
        }

        String categoryName = null;
        List<BigDecimal> amounts = new ArrayList<>();
        List<String> noteWords = new ArrayList<>();

        // Treat "100+50" as one numeric run so arithmetic keeps working.
        String normalised = raw.replaceAll("(?<=\\d)\\s*\\+\\s*(?=\\d)", "+");

        for (String token : normalised.split("\\s+")) {
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

            String candidate = token.replace(",", "");
            if (candidate.matches("[+-]?\\d+(?:\\.\\d+)?(?:\\+\\d+(?:\\.\\d+)?)*")) {
                BigDecimal sum = BigDecimal.ZERO;
                for (String part : candidate.split("\\+")) {
                    sum = sum.add(new BigDecimal(part));
                }
                amounts.add(sum);
                continue;
            }

            // Everything alphabetic lands in the note.
            noteWords.add(token);
        }

        BigDecimal amount = amounts.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        String note = String.join(" ", noteWords);

        Category category = findOrCreateCategory(user, categoryName == null ? DEFAULT_CATEGORY : categoryName);

        Transaction transaction = new Transaction();
        transaction.setUser(user);
        transaction.setAmount(amount);
        transaction.setNote(note.isEmpty() ? null : note);
        transaction.setCategory(category);
        transaction.setDate(date == null ? LocalDate.now() : date);

        return transactionRepository.save(transaction);
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
}
