package com.coin.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
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
import com.coin.dto.SettlementInstructionResponse;
import com.coin.dto.SplitExpenseRequest;
import com.coin.dto.SplitExpenseResponse;
import com.coin.dto.SplitGroupDetailResponse;
import com.coin.dto.SplitGroupRequest;
import com.coin.dto.SplitGroupResponse;
import com.coin.dto.SplitParticipantRequest;
import com.coin.dto.SplitParticipantResponse;
import com.coin.entity.SplitExpense;
import com.coin.entity.SplitGroup;
import com.coin.entity.SplitParticipant;
import com.coin.entity.User;
import com.coin.exception.ApiException;
import com.coin.repository.SplitExpenseRepository;
import com.coin.repository.SplitGroupRepository;
import com.coin.repository.SplitParticipantRepository;

/**
 * Group-expense sharing. A group holds participants and the expenses paid by
 * them; balances and settlement instructions are never stored but recomputed on
 * every read, so the numbers can never drift out of sync with the rows.
 */
@Service
public class SplitService {

    private final SplitGroupRepository splitGroupRepository;
    private final SplitParticipantRepository splitParticipantRepository;
    private final SplitExpenseRepository splitExpenseRepository;

    public SplitService(SplitGroupRepository splitGroupRepository,
                        SplitParticipantRepository splitParticipantRepository,
                        SplitExpenseRepository splitExpenseRepository) {
        this.splitGroupRepository = splitGroupRepository;
        this.splitParticipantRepository = splitParticipantRepository;
        this.splitExpenseRepository = splitExpenseRepository;
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

        return toExpenseResponse(splitExpenseRepository.save(expense));
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

        return toExpenseResponse(splitExpenseRepository.save(expense));
    }

    @Transactional
    public void deleteExpense(User user, Long groupId, Long expenseId) {
        SplitGroup group = requireGroup(user, groupId);
        SplitExpense expense = splitExpenseRepository.findByIdAndGroup(expenseId, group)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That expense no longer exists"));
        splitExpenseRepository.delete(expense);
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

        return new SplitGroupDetailResponse(
                group.getId(),
                group.getName(),
                group.getDescription(),
                totalExpense,
                count,
                toRupees(basePaise),
                participantResponses,
                summary,
                settle(balances),
                expenseResponses);
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
}
