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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.coin.dto.SettlementAuditResponse;
import com.coin.dto.SettlementPaymentRequest;
import com.coin.dto.SettlementRequest;
import com.coin.dto.SplitExpenseRequest;
import com.coin.dto.SplitExpenseResponse;
import com.coin.dto.SplitGroupDetailResponse;
import com.coin.dto.SplitGroupRequest;
import com.coin.dto.SplitGroupResponse;
import com.coin.dto.SplitParticipantRequest;
import com.coin.dto.SplitParticipantResponse;
import com.coin.dto.SplitSettlementResponse;
import com.coin.entity.User;
import com.coin.repository.UserRepository;
import com.coin.service.SplitService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/split")
public class SplitController {

    private final SplitService splitService;
    private final UserRepository userRepository;

    public SplitController(SplitService splitService, UserRepository userRepository) {
        this.splitService = splitService;
        this.userRepository = userRepository;
    }

    // ------------------------------------------------------------------ groups

    @GetMapping("/groups")
    public ResponseEntity<List<SplitGroupResponse>> listGroups(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(splitService.listGroups(currentUser(userDetails)));
    }

    @PostMapping("/groups")
    @ResponseStatus(HttpStatus.CREATED)
    public SplitGroupResponse createGroup(@AuthenticationPrincipal UserDetails userDetails,
                                          @Valid @RequestBody SplitGroupRequest request) {
        return splitService.createGroup(currentUser(userDetails), request);
    }

    @GetMapping("/groups/{groupId}")
    public ResponseEntity<SplitGroupDetailResponse> getGroup(@AuthenticationPrincipal UserDetails userDetails,
                                                             @PathVariable Long groupId) {
        return ResponseEntity.ok(splitService.getGroup(currentUser(userDetails), groupId));
    }

    @PutMapping("/groups/{groupId}")
    public ResponseEntity<SplitGroupResponse> updateGroup(@AuthenticationPrincipal UserDetails userDetails,
                                                          @PathVariable Long groupId,
                                                          @Valid @RequestBody SplitGroupRequest request) {
        return ResponseEntity.ok(splitService.updateGroup(currentUser(userDetails), groupId, request));
    }

    @DeleteMapping("/groups/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteGroup(@AuthenticationPrincipal UserDetails userDetails, @PathVariable Long groupId) {
        splitService.deleteGroup(currentUser(userDetails), groupId);
    }

    // ------------------------------------------------------------ participants

    @PostMapping("/groups/{groupId}/participants")
    @ResponseStatus(HttpStatus.CREATED)
    public SplitParticipantResponse addParticipant(@AuthenticationPrincipal UserDetails userDetails,
                                                   @PathVariable Long groupId,
                                                   @Valid @RequestBody SplitParticipantRequest request) {
        return splitService.addParticipant(currentUser(userDetails), groupId, request);
    }

    @PutMapping("/groups/{groupId}/participants/{participantId}")
    public ResponseEntity<SplitParticipantResponse> renameParticipant(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId,
            @PathVariable Long participantId,
            @Valid @RequestBody SplitParticipantRequest request) {
        return ResponseEntity.ok(
                splitService.renameParticipant(currentUser(userDetails), groupId, participantId, request));
    }

    @DeleteMapping("/groups/{groupId}/participants/{participantId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeParticipant(@AuthenticationPrincipal UserDetails userDetails,
                                  @PathVariable Long groupId,
                                  @PathVariable Long participantId) {
        splitService.removeParticipant(currentUser(userDetails), groupId, participantId);
    }

    // ---------------------------------------------------------------- expenses

    @PostMapping("/groups/{groupId}/expenses")
    @ResponseStatus(HttpStatus.CREATED)
    public SplitExpenseResponse addExpense(@AuthenticationPrincipal UserDetails userDetails,
                                           @PathVariable Long groupId,
                                           @Valid @RequestBody SplitExpenseRequest request) {
        return splitService.addExpense(currentUser(userDetails), groupId, request);
    }

    @PutMapping("/groups/{groupId}/expenses/{expenseId}")
    public ResponseEntity<SplitExpenseResponse> updateExpense(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId,
            @PathVariable Long expenseId,
            @Valid @RequestBody SplitExpenseRequest request) {
        return ResponseEntity.ok(
                splitService.updateExpense(currentUser(userDetails), groupId, expenseId, request));
    }

    @DeleteMapping("/groups/{groupId}/expenses/{expenseId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteExpense(@AuthenticationPrincipal UserDetails userDetails,
                              @PathVariable Long groupId,
                              @PathVariable Long expenseId) {
        splitService.deleteExpense(currentUser(userDetails), groupId, expenseId);
    }

    // ------------------------------------------------------------- settlements

    @GetMapping("/groups/{groupId}/settlements")
    public ResponseEntity<List<SplitSettlementResponse>> listSettlements(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId) {
        return ResponseEntity.ok(splitService.listSettlements(currentUser(userDetails), groupId));
    }

    @PostMapping("/groups/{groupId}/settlements")
    @ResponseStatus(HttpStatus.CREATED)
    public SplitSettlementResponse recordSettlement(@AuthenticationPrincipal UserDetails userDetails,
                                                    @PathVariable Long groupId,
                                                    @Valid @RequestBody SettlementRequest request) {
        return splitService.recordSettlement(currentUser(userDetails), groupId, request);
    }

    @PutMapping("/groups/{groupId}/settlements/{settlementId}")
    public ResponseEntity<SplitSettlementResponse> updateSettlement(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId,
            @PathVariable Long settlementId,
            @Valid @RequestBody SettlementRequest request) {
        return ResponseEntity.ok(
                splitService.updateSettlement(currentUser(userDetails), groupId, settlementId, request));
    }

    @DeleteMapping("/groups/{groupId}/settlements/{settlementId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSettlement(@AuthenticationPrincipal UserDetails userDetails,
                                 @PathVariable Long groupId,
                                 @PathVariable Long settlementId) {
        splitService.deleteSettlement(currentUser(userDetails), groupId, settlementId);
    }

    /** Mark as paid (omit the amount) or record a partial instalment. */
    @PostMapping("/groups/{groupId}/settlements/{settlementId}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    public SplitSettlementResponse recordPayment(@AuthenticationPrincipal UserDetails userDetails,
                                                 @PathVariable Long groupId,
                                                 @PathVariable Long settlementId,
                                                 @Valid @RequestBody SettlementPaymentRequest request) {
        return splitService.recordPayment(currentUser(userDetails), groupId, settlementId, request);
    }

    @DeleteMapping("/groups/{groupId}/settlements/{settlementId}/payments/{paymentId}")
    public ResponseEntity<SplitSettlementResponse> removePayment(@AuthenticationPrincipal UserDetails userDetails,
                                                                 @PathVariable Long groupId,
                                                                 @PathVariable Long settlementId,
                                                                 @PathVariable Long paymentId) {
        return ResponseEntity.ok(
                splitService.removePayment(currentUser(userDetails), groupId, settlementId, paymentId));
    }

    @GetMapping("/groups/{groupId}/settlements/history")
    public ResponseEntity<List<SettlementAuditResponse>> settlementHistory(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long groupId) {
        return ResponseEntity.ok(splitService.settlementHistory(currentUser(userDetails), groupId));
    }

    /** Clears the reconciliation flag after the user has reviewed the records. */
    @PostMapping("/groups/{groupId}/settlements/reconcile")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markReconciled(@AuthenticationPrincipal UserDetails userDetails,
                               @PathVariable Long groupId) {
        splitService.markReconciled(currentUser(userDetails), groupId);
    }

    private User currentUser(UserDetails userDetails) {
        return userRepository.findByEmailIgnoreCase(userDetails.getUsername()).orElseThrow();
    }
}
