package com.coin.service;

import java.math.BigDecimal;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.coin.entity.Category;
import com.coin.entity.Transaction;
import com.coin.entity.User;
import com.coin.repository.CategoryRepository;
import com.coin.repository.TransactionRepository;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;

    private static final Pattern ENTRY_PATTERN = Pattern.compile("^([+-]?\\d+(?:\\.\\d+)?)\\s*(.*?)(?:\\s*#(\\w+))?$");

    public TransactionService(TransactionRepository transactionRepository, CategoryRepository categoryRepository) {
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional
    public Transaction processEntry(User user, String input) {
        String trimmedInput = input.trim();
        
        // Basic arithmetic support (e.g., 100+50)
        if (trimmedInput.contains("+") && !trimmedInput.startsWith("+")) {
            try {
                String[] parts = trimmedInput.split("\\+");
                BigDecimal total = BigDecimal.ZERO;
                for (String part : parts) {
                    total = total.add(new BigDecimal(part.replaceAll("[^\\d.]", "")));
                }
                // Reconstruct input with the sum for standard parsing
                trimmedInput = total.toString() + " " + trimmedInput.replaceAll("[\\d. +]", "");
            } catch (Exception ignored) {}
        }

        Matcher matcher = ENTRY_PATTERN.matcher(trimmedInput);
        if (!matcher.matches()) {
            throw new IllegalArgumentException("Invalid entry format. Try: '100 chai #office'");
        }

        BigDecimal amount = new BigDecimal(matcher.group(1));
        String note = matcher.group(2).trim();
        String categoryName = matcher.group(3);

        if (categoryName == null || categoryName.isEmpty()) {
            categoryName = "daily"; // Default category
        }

        Category category = findOrCreateCategory(user, categoryName);

        Transaction transaction = new Transaction();
        transaction.setUser(user);
        transaction.setAmount(amount);
        transaction.setNote(note.isEmpty() ? null : note);
        transaction.setCategory(category);

        return transactionRepository.save(transaction);
    }

    private Category findOrCreateCategory(User user, String name) {
        return categoryRepository.findByUserAndNameIgnoreCase(user, name)
                .orElseGet(() -> {
                    Category newCat = new Category();
                    newCat.setUser(user);
                    newCat.setName(name.toLowerCase());
                    // Assign a random color or cycle through theme colors
                    String[] colors = {"indigo", "mint", "amber", "blue", "rose"};
                    int count = (int) categoryRepository.count();
                    newCat.setColor(colors[count % colors.length]);
                    return categoryRepository.save(newCat);
                });
    }
}
