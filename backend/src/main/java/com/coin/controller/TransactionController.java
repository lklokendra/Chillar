package com.coin.controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.coin.dto.KhataResponse;
import com.coin.dto.TransactionResponse;
import com.coin.entity.Category;
import com.coin.entity.Transaction;
import com.coin.entity.User;
import com.coin.exception.ApiException;
import com.coin.repository.CategoryRepository;
import com.coin.repository.TransactionRepository;
import com.coin.repository.UserRepository;
import com.coin.service.TransactionService;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService transactionService;
    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    public TransactionController(TransactionService transactionService, 
                                 TransactionRepository transactionRepository, 
                                 CategoryRepository categoryRepository,
                                 UserRepository userRepository) {
        this.transactionService = transactionService;
        this.transactionRepository = transactionRepository;
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/khatas")
    public ResponseEntity<List<KhataResponse>> getKhatas(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername()).orElseThrow();
        List<Category> categories = categoryRepository.findByUserOrderByCreatedAtAsc(user);
        
        List<KhataResponse> responses = new ArrayList<>();
        
        // Add #all
        BigDecimal totalAll = transactionRepository.sumAmountByUser(user);
        responses.add(new KhataResponse(null, "all", totalAll, "mint"));
        
        for (Category cat : categories) {
            BigDecimal total = transactionRepository.sumAmountByUserAndCategory(user, cat);
            responses.add(new KhataResponse(cat.getId(), cat.getName(), total, cat.getColor()));
        }
        
        return ResponseEntity.ok(responses);
    }

    @GetMapping
    public ResponseEntity<List<TransactionResponse>> getTransactions(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String category) {
        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername()).orElseThrow();
        
        List<Transaction> transactions;
        if (category != null && !category.equalsIgnoreCase("all")) {
            Category cat = categoryRepository.findByUserAndNameIgnoreCase(user, category).orElse(null);
            transactions = cat == null
                ? List.of()
                : transactionRepository.findByUserAndCategoryOrderByDateDescCreatedAtDesc(user, cat);
        } else {
            transactions = transactionRepository.findByUserOrderByDateDescCreatedAtDesc(user);
        }
        
        return ResponseEntity.ok(transactions.stream()
            .map(t -> new TransactionResponse(
                t.getId(), 
                t.getAmount(), 
                t.getNote(), 
                t.getCategory() != null ? t.getCategory().getName() : "daily", 
                t.getDate()))
            .toList());
    }

    @PostMapping("/add")
    public ResponseEntity<TransactionResponse> addEntry(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> request) {
        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername()).orElseThrow();
        String input = request.get("input");
        String dateValue = request.get("date");

        LocalDate date = null;
        if (dateValue != null && !dateValue.isBlank()) {
            try {
                date = LocalDate.parse(dateValue.trim());
            } catch (DateTimeParseException ex) {
                throw new IllegalArgumentException("Date must look like 2026-10-31");
            }
        }

        Transaction t = transactionService.processEntry(user, input, date);
        
        return ResponseEntity.ok(new TransactionResponse(
            t.getId(), 
            t.getAmount(), 
            t.getNote(), 
            t.getCategory().getName(), 
            t.getDate()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteEntry(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername()).orElseThrow();
        Transaction transaction = transactionRepository.findByIdAndUser(id, user)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That entry no longer exists"));
        transactionRepository.delete(transaction);
    }
}
