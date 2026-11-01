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
import com.coin.dto.SavingsGoalRequest;
import com.coin.dto.SavingsGoalResponse;
import com.coin.dto.SavingsRequest;
import com.coin.dto.SavingsTransactionResponse;
import com.coin.dto.WithdrawalAllocationRequest;
import com.coin.entity.User;
import com.coin.repository.UserRepository;
import com.coin.service.SavingsGoalService;
import com.coin.service.SavingsSummaryService;
import com.coin.service.SavingsTransactionService;

import jakarta.validation.Valid;

/**
 * The gullak: category-wise savings plus the goals those categories are.
 *
 * <p>The user is always taken from the security context — a caller can never
 * name the account it is writing to.
 */
@RestController
@RequestMapping("/api/gullak")
public class GullakController {

    private final SavingsTransactionService transactionService;
    private final SavingsGoalService goalService;
    private final SavingsSummaryService summaryService;
    private final UserRepository userRepository;

    public GullakController(SavingsTransactionService transactionService,
                            SavingsGoalService goalService,
                            SavingsSummaryService summaryService,
                            UserRepository userRepository) {
        this.transactionService = transactionService;
        this.goalService = goalService;
        this.summaryService = summaryService;
        this.userRepository = userRepository;
    }

    /* ------------------------------------------------------------ overview */

    @GetMapping("/summary")
    public ResponseEntity<GullakSummaryResponse> summary(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(summaryService.summary(user(userDetails)));
    }

    /* -------------------------------------------------------- transactions */

    @GetMapping("/transactions")
    public ResponseEntity<List<SavingsTransactionResponse>> getTransactions(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String type,
            @RequestParam(required = false, defaultValue = "date") String sort,
            @RequestParam(required = false, defaultValue = "desc") String direction,
            @RequestParam(required = false) String goal) {
        return ResponseEntity.ok(transactionService.list(user(userDetails), type, sort, direction, goal));
    }

    @GetMapping("/transactions/recent")
    public ResponseEntity<List<SavingsTransactionResponse>> recentTransactions(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(transactionService.recent(user(userDetails)));
    }

    @PostMapping("/transactions")
    @ResponseStatus(HttpStatus.CREATED)
    public SavingsTransactionResponse addTransaction(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SavingsRequest request) {
        return transactionService.create(user(userDetails), request);
    }

    @PutMapping("/transactions/{transactionId}")
    public ResponseEntity<SavingsTransactionResponse> updateTransaction(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long transactionId,
            @Valid @RequestBody SavingsRequest request) {
        return ResponseEntity.ok(transactionService.update(user(userDetails), transactionId, request));
    }

    /**
     * Withdraws one amount across several categories. Used when the category
     * the user named cannot cover the request on its own but the jar as a whole
     * can. The response carries one row per category, all sharing a group id.
     */
    @PostMapping("/withdrawals/allocate")
    @ResponseStatus(HttpStatus.CREATED)
    public List<SavingsTransactionResponse> allocateWithdrawal(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody WithdrawalAllocationRequest request) {
        return transactionService.allocateWithdrawal(user(userDetails), request);
    }

    @DeleteMapping("/transactions/{transactionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTransaction(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long transactionId) {
        transactionService.delete(user(userDetails), transactionId);
    }

    /* --------------------------------------------------------------- goals */

    @GetMapping("/goals")
    public ResponseEntity<List<SavingsGoalResponse>> getGoals(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(goalService.list(user(userDetails)));
    }

    @PostMapping("/goals")
    @ResponseStatus(HttpStatus.CREATED)
    public SavingsGoalResponse addGoal(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SavingsGoalRequest request) {
        return goalService.create(user(userDetails), request);
    }

    @GetMapping("/goals/{goalId}")
    public ResponseEntity<SavingsGoalResponse> getGoal(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long goalId) {
        return ResponseEntity.ok(goalService.detail(user(userDetails), goalId));
    }

    @GetMapping("/goals/{goalId}/summary")
    public ResponseEntity<SavingsGoalResponse> getGoalSummary(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long goalId) {
        return ResponseEntity.ok(goalService.summary(user(userDetails), goalId));
    }

    @GetMapping("/goals/{goalId}/transactions")
    public ResponseEntity<List<SavingsTransactionResponse>> getGoalTransactions(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long goalId) {
        return ResponseEntity.ok(transactionService.byGoal(user(userDetails), goalId));
    }

    @PutMapping("/goals/{goalId}")
    public ResponseEntity<SavingsGoalResponse> updateGoal(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long goalId,
            @Valid @RequestBody SavingsGoalRequest request) {
        return ResponseEntity.ok(goalService.update(user(userDetails), goalId, request));
    }

    @DeleteMapping("/goals/{goalId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGoal(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long goalId) {
        goalService.delete(user(userDetails), goalId);
    }

    private User user(UserDetails userDetails) {
        return userRepository.findByEmailIgnoreCase(userDetails.getUsername()).orElseThrow();
    }
}
