package com.coin.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.coin.dto.GullakSummaryResponse;
import com.coin.dto.SavingsRequest;
import com.coin.dto.SavingsTransactionResponse;
import com.coin.entity.User;
import com.coin.repository.UserRepository;
import com.coin.service.GullakService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/gullak")
public class GullakController {

    private final GullakService gullakService;
    private final UserRepository userRepository;

    public GullakController(GullakService gullakService, UserRepository userRepository) {
        this.gullakService = gullakService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<GullakSummaryResponse> summary(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(gullakService.summary(user));
    }

    @GetMapping("/transactions")
    public ResponseEntity<List<SavingsTransactionResponse>> getTransactions(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String type,
            @RequestParam(required = false, defaultValue = "date") String sort,
            @RequestParam(required = false, defaultValue = "desc") String direction) {
        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(gullakService.list(user, type, sort, direction));
    }

    @PostMapping("/transactions")
    @ResponseStatus(HttpStatus.CREATED)
    public SavingsTransactionResponse addTransaction(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SavingsRequest request) {
        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername()).orElseThrow();
        return gullakService.create(user, request);
    }

    @PutMapping("/transactions/{id}")
    public ResponseEntity<SavingsTransactionResponse> updateTransaction(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody SavingsRequest request) {
        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername()).orElseThrow();
        return ResponseEntity.ok(gullakService.update(user, id, request));
    }

    @DeleteMapping("/transactions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTransaction(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        User user = userRepository.findByEmailIgnoreCase(userDetails.getUsername()).orElseThrow();
        gullakService.delete(user, id);
    }
}
