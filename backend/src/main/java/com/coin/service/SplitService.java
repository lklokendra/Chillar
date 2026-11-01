package com.coin.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.coin.dto.ParticipantSummaryResponse;
import com.coin.dto.SettlementAuditResponse;
import com.coin.dto.SettlementDashboardResponse;
import com.coin.dto.SettlementInstructionResponse;
import com.coin.dto.SettlementPaymentRequest;
import com.coin.dto.SettlementPaymentResponse;
import com.coin.dto.SettlementRequest;
import com.coin.dto.SplitExpenseRequest;
import com.coin.dto.SplitExpenseResponse;
import com.coin.dto.SplitGroupDetailResponse;
import com.coin.dto.SplitGroupRequest;
import com.coin.dto.SplitGroupResponse;
import com.coin.dto.SplitParticipantRequest;
import com.coin.dto.SplitParticipantResponse;
import com.coin.dto.SplitSettlementResponse;
import com.coin.entity.SettlementAuditLog;
import com.coin.entity.SettlementPayment;
import com.coin.entity.SplitExpense;
import com.coin.entity.SplitGroup;
import com.coin.entity.SplitParticipant;
import com.coin.entity.SplitSettlement;
import com.coin.entity.User;
import com.coin.exception.ApiException;
import com.coin.repository.SettlementAuditLogRepository;
import com.coin.repository.SettlementPaymentRepository;
import com.coin.repository.SplitExpenseRepository;
import com.coin.repository.SplitGroupRepository;
import com.coin.repository.SplitParticipantRepository;
import com.coin.repository.SplitSettlementRepository;

/**
 * Group-expense sharing. A group holds participants and the expenses paid by
 * them; balances and settlement instructions are never stored but recomputed on
 * every read, so the numbers can never drift out of sync with the rows.
 *
 * <p>On top of that live view sit the <em>recorded</em> settlements: real
 * agreements between two participants with their own instalments and audit
 * trail. Those are stored, and are deliberately never rewritten when an expense
 * changes - the group is flagged for reconciliation instead.
 */
@Service
public class SplitService {

    private final SplitGroupRepository splitGroupRepository;
    private final SplitParticipantRepository splitParticipantRepository;
    private final SplitExpenseRepository splitExpenseRepository;
    private final SplitSettlementRepository splitSettlementRepository;
    private final SettlementPaymentRepository settlementPaymentRepository;
    private final SettlementAuditLogRepository settlementAuditLogRepository;

    public SplitService(SplitGroupRepository splitGroupRepository,
                        SplitParticipantRepository splitParticipantRepository,
                        SplitExpenseRepository splitExpenseRepository,
                        SplitSettlementRepository splitSettlementRepository,
                        SettlementPaymentRepository settlementPaymentRepository,
                        SettlementAuditLogRepository settlementAuditLogRepository) {
        this.splitGroupRepository = splitGroupRepository;
        this.splitParticipantRepository = splitParticipantRepository;
        this.splitExpenseRepository = splitExpenseRepository;
        this.splitSettlementRepository = splitSettlementRepository;
        this.settlementPaymentRepository = settlementPaymentRepository;
        this.settlementAuditLogRepository = settlementAuditLogRepository;
    }

    // ------------------------------------------------------------------ groups

    @Transactional(readOnly = true)
    public List<SplitGroupResponse> listGroups(User user) {
        return splitGroupRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::toGroupResponse)
                .toList();
    }

    @Transactional
    public SplitGroupResponse createGroup(User user, SplitGroupRequest request) {
        String name = request.name() == null ? "" : request.name().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Group name is required");
        }

        SplitGroup group = new SplitGroup();
        group.setUser(user);
        group.setName(name);
        group.setDescription(trimToNull(request.description()));

        return toGroupResponse(splitGroupRepository.save(group));
    }

    @Transactional(readOnly = true)
    public SplitGroupDetailResponse getGroup(User user, Long groupId) {
        SplitGroup group = requireGroup(user, groupId);
        return buildDetail(group);
    }

    @Transactional
    public SplitGroupResponse updateGroup(User user, Long groupId, SplitGroupRequest request) {
        SplitGroup group = requireGroup(user, groupId);

        String name = request.name() == null ? "" : request.name().trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Group name is required");
        }
        group.setName(name);
        group.setDescription(trimToNull(request.description()));

        return toGroupResponse(splitGroupRepository.save(group));
    }

    @Transactional
    public void deleteGroup(User user, Long groupId) {
        // The mapped cascades remove this group's participants and expenses too.
        splitGroupRepository.delete(requireGroup(user, groupId));
    }

    // ------------------------------------------------------------ participants

    @Transactional
    public SplitParticipantResponse addParticipant(User user, Long groupId, SplitParticipantRequest request) {
        SplitGroup group = requireGroup(user, groupId);
        String name = request.name() == null ? "" : request.name().trim();

        if (splitParticipantRepository.existsByGroupAndNameIgnoreCase(group, name)) {
            throw new ApiException(HttpStatus.CONFLICT, "That name is already in this group");
        }

        SplitParticipant participant = new SplitParticipant();
        participant.setGroup(group);
        participant.setName(name);

        return toParticipantResponse(splitParticipantRepository.save(participant));
    }

    @Transactional
    public SplitParticipantResponse renameParticipant(User user, Long groupId, Long participantId,
                                                      SplitParticipantRequest request) {
        SplitGroup group = requireGroup(user, groupId);
        SplitParticipant participant = splitParticipantRepository.findByIdAndGroup(participantId, group)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That participant is not in this group"));
        String name = request.name() == null ? "" : request.name().trim();

        // A rename to the same name (ignoring case) is fine; anything else must be unique.
        boolean changed = !name.equalsIgnoreCase(participant.getName());
        if (changed && splitParticipantRepository.existsByGroupAndNameIgnoreCase(group, name)) {
            throw new ApiException(HttpStatus.CONFLICT, "That name is already in this group");
        }

        participant.setName(name);
        return toParticipantResponse(splitParticipantRepository.save(participant));
    }

    @Transactional
    public void removeParticipant(User user, Long groupId, Long participantId) {
        SplitGroup group = requireGroup(user, groupId);
        SplitParticipant participant = splitParticipantRepository.findByIdAndGroup(participantId, group)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That participant is not in this group"));

        if (splitExpenseRepository.countByParticipant(participant) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "Remove this participant's expenses first");
        }

        if (splitSettlementRepository.countByPayerOrReceiver(participant, participant) > 0) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "This participant is part of a settlement record. Delete those records first.");
        }

        splitParticipantRepository.delete(participant);
    }

    // ---------------------------------------------------------------- expenses

    @Transactional
    public SplitExpenseResponse addExpense(User user, Long groupId, SplitExpenseRequest request) {
        SplitGroup group = requireGroup(user, groupId);
        SplitParticipant participant = resolvePayer(group, request.participantId());
        BigDecimal amount = requirePositiveAmount(request.amount());

        SplitExpense expense = new SplitExpense();
        expense.setGroup(group);
        expense.setParticipant(participant);
        expense.setTitle(request.title() == null ? "" : request.title().trim());
        expense.setAmount(amount);
        expense.setDate(request.date() == null ? LocalDate.now() : request.date());

        SplitExpenseResponse response = toExpenseResponse(splitExpenseRepository.save(expense));
        flagReconciliation(group, "An expense was added");
        return response;
    }

    @Transactional
    public SplitExpenseResponse updateExpense(User user, Long groupId, Long expenseId, SplitExpenseRequest request) {
        SplitGroup group = requireGroup(user, groupId);
        SplitExpense expense = splitExpenseRepository.findByIdAndGroup(expenseId, group)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That expense no longer exists"));
        SplitParticipant participant = resolvePayer(group, request.participantId());
        BigDecimal amount = requirePositiveAmount(request.amount());

        expense.setParticipant(participant);
        expense.setTitle(request.title() == null ? "" : request.title().trim());
        expense.setAmount(amount);
        expense.setDate(request.date() == null ? LocalDate.now() : request.date());

        SplitExpenseResponse response = toExpenseResponse(splitExpenseRepository.save(expense));
        flagReconciliation(group, "An expense was edited");
        return response;
    }

    @Transactional
    public void deleteExpense(User user, Long groupId, Long expenseId) {
        SplitGroup group = requireGroup(user, groupId);
        SplitExpense expense = splitExpenseRepository.findByIdAndGroup(expenseId, group)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That expense no longer exists"));
        String title = expense.getTitle();
        splitExpenseRepository.delete(expense);
        flagReconciliation(group, "An expense was deleted (" + title + ")");
    }

    // ------------------------------------------------------------- settlements

    /**
     * The recorded settlements and the roll-up for one group. Payments for every
     * settlement are fetched in a single query so this stays O(1) in queries.
     */
    private SettlementBundle loadSettlements(SplitGroup group) {
        List<SplitSettlement> records = splitSettlementRepository.findByGroupWithParticipants(group);
        Map<Long, List<SettlementPayment>> paymentsBySettlement = new HashMap<>();
        if (!records.isEmpty()) {
            for (SettlementPayment payment : settlementPaymentRepository.findBySettlements(records)) {
                paymentsBySettlement.computeIfAbsent(payment.getSettlement().getId(), key -> new ArrayList<>())
                        .add(payment);
            }
        }

        List<SplitSettlementResponse> responses = new ArrayList<>();
        BigDecimal totalOwed = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalReceived = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        int completed = 0;
        int partial = 0;
        int pending = 0;

        for (SplitSettlement record : records) {
            List<SettlementPayment> payments =
                    paymentsBySettlement.getOrDefault(record.getId(), List.of());
            long paidPaise = payments.stream()
                    .mapToLong(payment -> payment.getAmount().movePointRight(2).longValueExact())
                    .sum();
            BigDecimal paid = toRupees(paidPaise);
            BigDecimal remaining = record.getAmount().subtract(paid).setScale(2, RoundingMode.HALF_UP);

            responses.add(toSettlementResponse(record, payments, paid, remaining));
            totalOwed = totalOwed.add(record.getAmount());
            totalReceived = totalReceived.add(paid);

            if (SplitSettlement.STATUS_PAID.equals(record.getStatus())) {
                completed++;
            } else if (SplitSettlement.STATUS_PARTIALLY_PAID.equals(record.getStatus())) {
                partial++;
            } else {
                pending++;
            }
        }

        return new SettlementBundle(responses, totalOwed, totalReceived, completed, partial, pending);
    }

    @Transactional(readOnly = true)
    public List<SplitSettlementResponse> listSettlements(User user, Long groupId) {
        return loadSettlements(requireGroup(user, groupId)).records();
    }

    @Transactional(readOnly = true)
    public List<SettlementAuditResponse> settlementHistory(User user, Long groupId) {
        SplitGroup group = requireGroup(user, groupId);
        return settlementAuditLogRepository.findTop50ByGroupOrderByCreatedAtDesc(group).stream()
                .map(this::toAuditResponse)
                .toList();
    }

    /** Logs a settlement between two participants of the group as PENDING. */
    @Transactional
    public SplitSettlementResponse recordSettlement(User user, Long groupId, SettlementRequest request) {
        SplitGroup group = requireGroup(user, groupId);
        if (request.payerId() != null && request.payerId().equals(request.receiverId())) {
            throw new IllegalArgumentException("The payer and the receiver must be different people");
        }
        SplitParticipant payer = resolvePayer(group, request.payerId());
        SplitParticipant receiver = resolvePayer(group, request.receiverId());
        BigDecimal amount = requirePositiveAmount(request.amount()).setScale(2, RoundingMode.HALF_UP);
        LocalDate date = request.date() == null ? LocalDate.now() : request.date();

        // Guard against logging the same hand-over twice.
        if (splitSettlementRepository.existsByGroupAndPayerAndReceiverAndAmountAndDate(
                group, payer, receiver, amount, date)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "An identical settlement between these two on that date already exists");
        }

        SplitSettlement settlement = new SplitSettlement();
        settlement.setGroup(group);
        settlement.setPayer(payer);
        settlement.setReceiver(receiver);
        settlement.setAmount(amount);
        settlement.setDate(date);
        settlement.setNote(trimToNull(request.note()));
        settlement.setStatus(SplitSettlement.STATUS_PENDING);
        SplitSettlement saved = splitSettlementRepository.save(settlement);

        audit(group, saved.getId(), "SETTLEMENT_CREATED",
                payer.getName() + " → " + receiver.getName() + " · ₹" + amount.toPlainString() + " logged as pending");

        return toSettlementResponse(saved, List.of(), BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                amount);
    }

    /**
     * Records an instalment. An omitted amount pays the whole outstanding
     * remainder; anything larger than the remainder is rejected, so a settlement
     * can never be overpaid.
     */
    @Transactional
    public SplitSettlementResponse recordPayment(User user, Long groupId, Long settlementId,
                                                 SettlementPaymentRequest request) {
        SplitGroup group = requireGroup(user, groupId);
        SplitSettlement settlement = requireSettlement(group, settlementId);

        BigDecimal alreadyPaid = paidOf(settlement);
        BigDecimal remaining = settlement.getAmount().subtract(alreadyPaid).setScale(2, RoundingMode.HALF_UP);
        if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "This settlement is already fully paid");
        }

        BigDecimal amount = request.amount() == null
                ? remaining
                : request.amount().setScale(2, RoundingMode.HALF_UP);
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment must be greater than zero");
        }
        if (amount.compareTo(remaining) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Only ₹" + remaining.toPlainString() + " is still pending on this settlement");
        }

        SettlementPayment payment = new SettlementPayment();
        payment.setSettlement(settlement);
        payment.setAmount(amount);
        payment.setPaidAt(request.paidAt() == null ? LocalDate.now() : request.paidAt());
        payment.setNote(trimToNull(request.note()));
        settlementPaymentRepository.save(payment);

        audit(group, settlement.getId(), "PAYMENT_RECORDED",
                "₹" + amount.toPlainString() + " paid by " + settlement.getPayer().getName()
                        + " to " + settlement.getReceiver().getName());

        return refreshSettlement(group, settlement);
    }

    /** Removes one instalment (a correction) and re-derives the status. */
    @Transactional
    public SplitSettlementResponse removePayment(User user, Long groupId, Long settlementId, Long paymentId) {
        SplitGroup group = requireGroup(user, groupId);
        SplitSettlement settlement = requireSettlement(group, settlementId);
        SettlementPayment payment = settlementPaymentRepository.findByIdAndSettlement(paymentId, settlement)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That payment no longer exists"));

        BigDecimal amount = payment.getAmount();
        settlementPaymentRepository.delete(payment);
        audit(group, settlement.getId(), "PAYMENT_REMOVED",
                "₹" + amount.toPlainString() + " payment removed by correction");

        return refreshSettlement(group, settlement);
    }

    /** Deletes a whole settlement record, keeping an audit trail behind. */
    @Transactional
    public void deleteSettlement(User user, Long groupId, Long settlementId) {
        SplitGroup group = requireGroup(user, groupId);
        SplitSettlement settlement = requireSettlement(group, settlementId);

        audit(group, settlement.getId(), "SETTLEMENT_DELETED",
                settlement.getPayer().getName() + " → " + settlement.getReceiver().getName()
                        + " · ₹" + settlement.getAmount().toPlainString() + " record removed");
        splitSettlementRepository.delete(settlement);
    }

    /** Clears the reconciliation flag once the user has reviewed the records. */
    @Transactional
    public void markReconciled(User user, Long groupId) {
        SplitGroup group = requireGroup(user, groupId);
        group.setNeedsReconciliation(false);
        splitGroupRepository.save(group);
        audit(group, null, "RECONCILED", "Settlement records reviewed after a balance change");
    }

    /** Recomputes a settlement's paid total, status and response after a change. */
    private SplitSettlementResponse refreshSettlement(SplitGroup group, SplitSettlement settlement) {
        List<SettlementPayment> payments =
                settlementPaymentRepository.findBySettlementOrderByPaidAtAscCreatedAtAsc(settlement);
        BigDecimal paid = toRupees(payments.stream()
                .mapToLong(payment -> payment.getAmount().movePointRight(2).longValueExact())
                .sum());
        BigDecimal remaining = settlement.getAmount().subtract(paid).setScale(2, RoundingMode.HALF_UP);

        String status = paid.compareTo(BigDecimal.ZERO) <= 0
                ? SplitSettlement.STATUS_PENDING
                : paid.compareTo(settlement.getAmount()) >= 0
                        ? SplitSettlement.STATUS_PAID
                        : SplitSettlement.STATUS_PARTIALLY_PAID;
        settlement.setStatus(status);
        settlement.setUpdatedAt(Instant.now());
        splitSettlementRepository.save(settlement);

        return toSettlementResponse(settlement, payments, paid, remaining);
    }

    private BigDecimal paidOf(SplitSettlement settlement) {
        return toRupees(settlementPaymentRepository
                .findBySettlementOrderByPaidAtAscCreatedAtAsc(settlement).stream()
                .mapToLong(payment -> payment.getAmount().movePointRight(2).longValueExact())
                .sum());
    }

    /**
     * When an expense changes while settlement records exist, the group is
     * flagged for reconciliation and the change is written to the audit trail.
     * The settlement records themselves are never silently rewritten or dropped.
     */
    private void flagReconciliation(SplitGroup group, String detail) {
        if (splitSettlementRepository.countByGroup(group) == 0) {
            return;
        }
        group.setNeedsReconciliation(true);
        splitGroupRepository.save(group);
        audit(group, null, "BALANCE_CHANGED",
                detail + " - settlement records may no longer match the new balances");
    }

    private void audit(SplitGroup group, Long settlementId, String action, String detail) {
        SettlementAuditLog entry = new SettlementAuditLog();
        entry.setGroup(group);
        entry.setSettlementId(settlementId);
        entry.setAction(action);
        entry.setDetail(detail);
        settlementAuditLogRepository.save(entry);
    }

    private SplitSettlement requireSettlement(SplitGroup group, Long settlementId) {
        return splitSettlementRepository.findByIdAndGroup(settlementId, group)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That settlement no longer exists"));
    }

    // --------------------------------------------------------------- dashboard

    /**
     * Recomputes the whole dashboard from stored rows: totals, per-participant
     * fair shares, balances and the minimum settlement transfers. Everything is
     * done in integer paise so the numbers reconcile exactly.
     */
    private SplitGroupDetailResponse buildDetail(SplitGroup group) {
        List<SplitParticipant> participants = splitParticipantRepository.findByGroupOrderByCreatedAtAsc(group);
        List<SplitExpense> expenses = splitExpenseRepository.findByGroupWithParticipant(group);
        BigDecimal totalExpense = splitExpenseRepository.sumAmountByGroup(group).setScale(2, RoundingMode.HALF_UP);
        int count = participants.size();

        // Equal fair share allocated at paise level: divide the total into whole
        // paise and hand the leftover paise to the first participants (in createdAt
        // order) so the individual shares add back up to totalExpense exactly.
        long totalPaise = totalExpense.movePointRight(2).longValueExact();
        long basePaise = count > 0 ? totalPaise / count : 0;
        long remainder = count > 0 ? totalPaise % count : 0;

        // Amount paid per participant, summed from the already-fetched expenses
        // rather than firing a query per participant.
        Map<Long, Long> paidPaise = new HashMap<>();
        for (SplitParticipant participant : participants) {
            paidPaise.put(participant.getId(), 0L);
        }
        for (SplitExpense expense : expenses) {
            long amountPaise = expense.getAmount().movePointRight(2).longValueExact();
            paidPaise.merge(expense.getParticipant().getId(), amountPaise, Long::sum);
        }

        List<ParticipantSummaryResponse> summary = new ArrayList<>();
        List<Balance> balances = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            SplitParticipant participant = participants.get(i);
            long paid = paidPaise.getOrDefault(participant.getId(), 0L);
            long fairShare = basePaise + (i < remainder ? 1 : 0);
            long net = paid - fairShare;
            balances.add(new Balance(participant.getId(), participant.getName(), net));
            summary.add(new ParticipantSummaryResponse(
                    participant.getId(),
                    participant.getName(),
                    toRupees(paid),
                    toRupees(fairShare),
                    toRupees(net)));
        }

        List<SplitParticipantResponse> participantResponses = participants.stream()
                .map(this::toParticipantResponse)
                .toList();

        List<SplitExpenseResponse> expenseResponses = expenses.stream()
                .map(this::toExpenseResponse)
                .toList();

        List<SettlementInstructionResponse> instructions = settle(balances);

        // The suggested instructions are the live view; the recorded settlements
        // are what actually happened. Both are returned, never merged.
        long suggestedPaise = instructions.stream()
                .mapToLong(instruction -> instruction.amount().movePointRight(2).longValueExact())
                .sum();

        SettlementBundle bundle = loadSettlements(group);
        SettlementDashboardResponse dashboard = new SettlementDashboardResponse(
                bundle.totalOwed(),
                bundle.totalReceived(),
                bundle.totalOwed().subtract(bundle.totalReceived()).setScale(2, RoundingMode.HALF_UP),
                toRupees(suggestedPaise),
                bundle.records().size(),
                bundle.completedCount(),
                bundle.partialCount(),
                bundle.pendingCount(),
                group.isNeedsReconciliation());

        List<SettlementAuditResponse> auditTrail = settlementAuditLogRepository
                .findTop50ByGroupOrderByCreatedAtDesc(group).stream()
                .map(this::toAuditResponse)
                .toList();

        return new SplitGroupDetailResponse(
                group.getId(),
                group.getName(),
                group.getDescription(),
                totalExpense,
                count,
                toRupees(basePaise),
                participantResponses,
                summary,
                instructions,
                expenseResponses,
                bundle.records(),
                dashboard,
                auditTrail);
    }

    /**
     * Greedy debt settlement: repeatedly match the biggest debtor with the
     * biggest creditor and move the smaller of the two amounts. Because every
     * amount is integer paise the transfers sum exactly to the outstanding debt.
     */
    private List<SettlementInstructionResponse> settle(List<Balance> balances) {
        List<Balance> creditors = balances.stream()
                .filter(b -> b.net() > 0)
                .sorted(Comparator.comparingLong(Balance::net).reversed())
                .toList();
        List<Balance> debtors = balances.stream()
                .filter(b -> b.net() < 0)
                .sorted(Comparator.comparingLong(Balance::net))
                .toList();

        long[] creditorRemaining = creditors.stream().mapToLong(Balance::net).toArray();
        long[] debtorRemaining = debtors.stream().mapToLong(b -> -b.net()).toArray();

        List<SettlementInstructionResponse> settlements = new ArrayList<>();
        int debtorIndex = 0;
        int creditorIndex = 0;
        while (debtorIndex < debtors.size() && creditorIndex < creditors.size()) {
            long transfer = Math.min(debtorRemaining[debtorIndex], creditorRemaining[creditorIndex]);
            Balance debtor = debtors.get(debtorIndex);
            Balance creditor = creditors.get(creditorIndex);
            settlements.add(new SettlementInstructionResponse(
                    debtor.id(), debtor.name(),
                    creditor.id(), creditor.name(),
                    toRupees(transfer)));

            debtorRemaining[debtorIndex] -= transfer;
            creditorRemaining[creditorIndex] -= transfer;
            if (debtorRemaining[debtorIndex] == 0) {
                debtorIndex++;
            }
            if (creditorRemaining[creditorIndex] == 0) {
                creditorIndex++;
            }
        }
        return settlements;
    }

    // ------------------------------------------------------------------ helpers

    /** Resolves a group the caller owns, or fails as if it never existed. */
    private SplitGroup requireGroup(User user, Long groupId) {
        return splitGroupRepository.findByIdAndUser(groupId, user)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That group no longer exists"));
    }

    /** The payer must be a participant of this group. */
    private SplitParticipant resolvePayer(SplitGroup group, Long participantId) {
        return splitParticipantRepository.findByIdAndGroup(participantId, group)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Choose a participant from this group"));
    }

    private BigDecimal requirePositiveAmount(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Amount must be greater than zero");
        }
        return amount;
    }

    private SplitGroupResponse toGroupResponse(SplitGroup group) {
        return new SplitGroupResponse(
                group.getId(),
                group.getName(),
                group.getDescription(),
                splitParticipantRepository.countByGroup(group),
                group.getExpenses().size(),
                splitExpenseRepository.sumAmountByGroup(group).setScale(2, RoundingMode.HALF_UP),
                group.getCreatedAt());
    }

    private SplitParticipantResponse toParticipantResponse(SplitParticipant participant) {
        return new SplitParticipantResponse(participant.getId(), participant.getName());
    }

    private SplitExpenseResponse toExpenseResponse(SplitExpense expense) {
        return new SplitExpenseResponse(
                expense.getId(),
                expense.getTitle(),
                expense.getAmount(),
                expense.getParticipant().getId(),
                expense.getParticipant().getName(),
                expense.getDate());
    }

    private SplitSettlementResponse toSettlementResponse(SplitSettlement settlement,
                                                         List<SettlementPayment> payments,
                                                         BigDecimal paid,
                                                         BigDecimal remaining) {
        List<SettlementPaymentResponse> paymentResponses = payments.stream()
                .map(payment -> new SettlementPaymentResponse(
                        payment.getId(),
                        payment.getAmount(),
                        payment.getPaidAt(),
                        payment.getNote(),
                        payment.getCreatedAt()))
                .toList();

        return new SplitSettlementResponse(
                settlement.getId(),
                settlement.getGroup().getId(),
                settlement.getPayer().getId(),
                settlement.getPayer().getName(),
                settlement.getReceiver().getId(),
                settlement.getReceiver().getName(),
                settlement.getAmount(),
                paid,
                remaining,
                settlement.getDate(),
                settlement.getStatus(),
                settlement.getNote(),
                paymentResponses,
                settlement.getCreatedAt(),
                settlement.getUpdatedAt());
    }

    private SettlementAuditResponse toAuditResponse(SettlementAuditLog entry) {
        return new SettlementAuditResponse(
                entry.getId(),
                entry.getSettlementId(),
                entry.getAction(),
                entry.getDetail(),
                entry.getCreatedAt());
    }

    private static BigDecimal toRupees(long paise) {
        return BigDecimal.valueOf(paise).movePointLeft(2).setScale(2, RoundingMode.HALF_UP);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /** One participant's running net balance in paise (positive = owed money). */
    private record Balance(Long id, String name, long net) {
    }

    /** The records plus their roll-up, computed in a single pass. */
    private record SettlementBundle(
            List<SplitSettlementResponse> records,
            BigDecimal totalOwed,
            BigDecimal totalReceived,
            int completedCount,
            int partialCount,
            int pendingCount) {
    }
}
