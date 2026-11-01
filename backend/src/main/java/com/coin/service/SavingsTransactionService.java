package com.coin.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.coin.dto.SavingsRequest;
import com.coin.dto.SavingsTransactionResponse;
import com.coin.dto.WithdrawalAllocationItem;
import com.coin.dto.WithdrawalAllocationRequest;
import com.coin.entity.SavingsGoal;
import com.coin.entity.SavingsTransaction;
import com.coin.entity.SavingsType;
import com.coin.entity.User;
import com.coin.exception.ApiException;
import com.coin.repository.SavingsGoalRepository;
import com.coin.repository.SavingsTransactionRepository;
import com.coin.repository.UserRepository;

/**
 * The gullak ledger: every deposit and every withdrawal.
 *
 * <p>Notes and amounts arrive already parsed by the shared hashtag parser; the
 * only thing this service does with the text is resolve the hashtag into a
 * {@link SavingsGoal}, creating it the first time the user mentions it. A row
 * with no hashtag stays general savings — an untagged entry is never attached
 * to a goal on the user's behalf.
 *
 * <p>Writes take a row lock on the account first ({@code findByIdForUpdate}) so
 * two withdrawals can never spend the same balance at the same time.
 *
 * <p>A withdrawal must fit both the jar as a whole and, when it is tagged, the
 * goal it names. Balances are derived from the ledger, so an edit or a delete
 * is validated by re-deriving the balance as if the change had already landed.
 */
@Service
public class SavingsTransactionService {

    /** How many rows the dashboard previews before you open the full history. */
    public static final int RECENT_LIMIT = 4;

    private final SavingsTransactionRepository savingsRepository;
    private final SavingsGoalRepository goalRepository;
    private final UserRepository userRepository;
    private final SavingsSummaryService summaryService;

    public SavingsTransactionService(SavingsTransactionRepository savingsRepository,
                                     SavingsGoalRepository goalRepository,
                                     UserRepository userRepository,
                                     SavingsSummaryService summaryService) {
        this.savingsRepository = savingsRepository;
        this.goalRepository = goalRepository;
        this.userRepository = userRepository;
        this.summaryService = summaryService;
    }

    @Transactional(readOnly = true)
    public List<SavingsTransactionResponse> list(User user, String type, String sort, String direction, String goal) {
        List<SavingsTransaction> rows = switch (goalFilter(goal)) {
            case GENERAL -> savingsRepository.findAllWithGoal(user).stream()
                    .filter(row -> row.getGoal() == null)
                    .toList();
            case GOAL -> savingsRepository.findAllWithGoalByGoal(user, requireGoal(user, goal));
            case ALL -> savingsRepository.findAllWithGoal(user);
        };

        SavingsType filter = (type == null || type.isBlank()) ? null : parseFilter(type);
        if (filter != null) {
            rows = rows.stream().filter(row -> row.getType() == filter).toList();
        }

        // Default is date descending; amount sort is opt-in via the query string.
        boolean byAmount = "amount".equalsIgnoreCase(sort == null ? "" : sort.trim());
        boolean ascending = "asc".equalsIgnoreCase(direction == null ? "" : direction.trim());

        Comparator<SavingsTransaction> comparator = byAmount
                ? Comparator.comparing(SavingsTransaction::getAmount)
                : Comparator.comparing(SavingsTransaction::getDate)
                        .thenComparing(SavingsTransaction::getCreatedAt);

        return rows.stream()
                .sorted(ascending ? comparator : comparator.reversed())
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SavingsTransactionResponse> recent(User user) {
        return savingsRepository.findRecent(user, PageRequest.of(0, RECENT_LIMIT)).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SavingsTransactionResponse> byGoal(User user, Long goalId) {
        return savingsRepository.findAllWithGoalByGoal(user, requireGoal(user, goalId)).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public SavingsTransactionResponse create(User user, SavingsRequest request) {
        // Lock the account so the balance we read below cannot change underneath us.
        userRepository.findByIdForUpdate(user.getId());

        SavingsType type = parseType(request.type());
        BigDecimal amount = SavingsSummaryService.scale(request.amount());
        SavingsGoal goal = resolveGoal(user, request.goal());

        if (type == SavingsType.WITHDRAWAL) {
            ensureWithdrawable(user, goal, amount);
        }

        SavingsTransaction row = new SavingsTransaction();
        row.setUser(user);
        row.setGoal(goal);
        row.setAmount(amount);
        row.setType(type);
        row.setNote(normaliseNote(request.note()));
        row.setDate(request.date() == null ? LocalDate.now() : request.date());

        return toResponse(savingsRepository.save(row));
    }

    /**
     * Withdraws one amount spread over several categories, because the category
     * the user first named did not hold enough.
     *
     * <p>Every allocation becomes its own ledger row — so the derived balances
     * keep working untouched — and they all share a group id so the UI can show
     * the split as the single transaction it really is. The whole thing is one
     * database transaction: if any line fails, nothing is written.
     */
    @Transactional
    public List<SavingsTransactionResponse> allocateWithdrawal(User user, WithdrawalAllocationRequest request) {
        // Lock the account so every balance read below is frozen for the write.
        userRepository.findByIdForUpdate(user.getId());

        BigDecimal total = SavingsSummaryService.scale(request.totalAmount());
        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Withdrawal amount must be greater than zero.");
        }

        List<WithdrawalAllocationItem> items = request.allocations();
        if (items == null || items.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose at least one savings category to withdraw from.");
        }

        // The jar as a whole has to cover the request before we look at its parts.
        BigDecimal overall = summaryService.balanceOf(user);
        if (total.compareTo(overall) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Insufficient Gullak balance. Available: ₹" + overall.toPlainString()
                            + ". Requested: ₹" + total.toPlainString() + ".");
        }

        Set<Long> usedGoalIds = new HashSet<>();
        boolean generalUsed = false;
        List<SavingsGoal> goals = new ArrayList<>(items.size());
        List<BigDecimal> amounts = new ArrayList<>(items.size());
        BigDecimal allocated = BigDecimal.ZERO;

        for (WithdrawalAllocationItem item : items) {
            BigDecimal amount = SavingsSummaryService.scale(item.amount());
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Every allocation must be greater than zero.");
            }

            SavingsGoal goal = null;
            if (item.goalId() == null) {
                if (generalUsed) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "General savings is listed more than once — each category can only be used once.");
                }
                generalUsed = true;
            } else {
                goal = requireGoal(user, item.goalId());
                if (!usedGoalIds.add(goal.getId())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, goal.getName()
                            + " is listed more than once — each category can only be used once.");
                }
            }

            BigDecimal available = summaryService.goalBalanceOf(user, goal);
            if (amount.compareTo(available) > 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Insufficient balance in " + categoryName(goal) + ". Available: ₹"
                                + available.toPlainString() + ".");
            }

            goals.add(goal);
            amounts.add(amount);
            allocated = allocated.add(amount);
        }

        allocated = SavingsSummaryService.scale(allocated);
        if (allocated.compareTo(total) != 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    allocated.compareTo(total) < 0
                            ? "₹" + total.subtract(allocated).toPlainString() + " is still left to allocate."
                            : "Allocated amount exceeds the requested withdrawal by ₹"
                                    + allocated.subtract(total).toPlainString() + ".");
        }

        String groupId = UUID.randomUUID().toString();
        LocalDate date = request.transactionDate() == null ? LocalDate.now() : request.transactionDate();
        String note = normaliseNote(request.note());

        List<SavingsTransaction> rows = new ArrayList<>(goals.size());
        for (int i = 0; i < goals.size(); i++) {
            SavingsTransaction row = new SavingsTransaction();
            row.setUser(user);
            row.setGoal(goals.get(i));
            row.setAmount(amounts.get(i));
            row.setType(SavingsType.WITHDRAWAL);
            row.setNote(note);
            row.setDate(date);
            row.setGroupId(groupId);
            rows.add(row);
        }

        return savingsRepository.saveAll(rows).stream().map(this::toResponse).toList();
    }

    @Transactional
    public SavingsTransactionResponse update(User user, Long id, SavingsRequest request) {
        userRepository.findByIdForUpdate(user.getId());

        SavingsTransaction row = savingsRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That gullak entry no longer exists"));

        if (row.getGroupId() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "This entry is one part of a split withdrawal. Delete it and record a new one instead.");
        }

        SavingsType type = parseType(request.type());
        BigDecimal amount = SavingsSummaryService.scale(request.amount());
        SavingsGoal target = resolveGoal(user, request.goal());

        SavingsGoal previous = row.getGoal();
        BigDecimal previousContribution = contributionOf(row);
        BigDecimal newContribution = type == SavingsType.DEPOSIT ? amount : amount.negate();
        boolean sameGoal = previous != null && target != null && previous.getId().equals(target.getId());

        // Re-derive the balance as if this row did not exist, so its old value
        // never unfairly blocks (or allows) the new one.
        BigDecimal overallRest = summaryService.balanceOf(user).subtract(previousContribution);
        BigDecimal resultingOverall = overallRest.add(newContribution);
        if (resultingOverall.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "You only have ₹" + overallRest.toPlainString() + " in your gullak");
        }

        // The goal this row is leaving must stay solvent without it.
        if (previous != null && !sameGoal) {
            BigDecimal rest = summaryService.goalBalanceOf(user, previous).subtract(previousContribution);
            if (rest.compareTo(BigDecimal.ZERO) < 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Only ₹" + rest.toPlainString() + " is saved in " + previous.getName()
                                + ", so this entry cannot be moved out of it.");
            }
        }

        // The goal this row is joining must not be overdrawn by it.
        if (target != null) {
            BigDecimal available = sameGoal
                    ? summaryService.goalBalanceOf(user, target).subtract(previousContribution)
                    : summaryService.goalBalanceOf(user, target);
            if (available.add(newContribution).compareTo(BigDecimal.ZERO) < 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Only ₹" + available.toPlainString() + " is saved in " + target.getName()
                                + ". Withdraw from your general savings instead.");
            }
        }

        row.setGoal(target);
        row.setAmount(amount);
        row.setType(type);
        row.setNote(normaliseNote(request.note()));
        row.setDate(request.date() == null ? LocalDate.now() : request.date());

        return toResponse(savingsRepository.save(row));
    }

    @Transactional
    public void delete(User user, Long id) {
        userRepository.findByIdForUpdate(user.getId());

        SavingsTransaction row = savingsRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That gullak entry no longer exists"));

        // A split withdrawal is deleted as a whole — removing one line would
        // leave the ledger describing a withdrawal the user never made.
        if (row.getGroupId() != null) {
            savingsRepository.deleteAll(savingsRepository.findAllByUserAndGroupId(user, row.getGroupId()));
            return;
        }

        BigDecimal contribution = contributionOf(row);

        BigDecimal overallRest = summaryService.balanceOf(user).subtract(contribution);
        if (overallRest.compareTo(BigDecimal.ZERO) < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Deleting this entry would drop your gullak to ₹" + overallRest.toPlainString()
                            + ". Remove the withdrawals that spend it first.");
        }

        if (row.getGoal() != null) {
            BigDecimal rest = summaryService.goalBalanceOf(user, row.getGoal()).subtract(contribution);
            if (rest.compareTo(BigDecimal.ZERO) < 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Deleting this entry would leave " + row.getGoal().getName()
                                + " short by ₹" + rest.abs().toPlainString() + ".");
            }
        }

        savingsRepository.delete(row);
    }

    public SavingsTransactionResponse toResponse(SavingsTransaction row) {
        SavingsGoal goal = row.getGoal();
        return new SavingsTransactionResponse(
                row.getId(),
                row.getAmount(),
                row.getType().name(),
                row.getNote(),
                row.getDate(),
                row.getCreatedAt(),
                goal == null ? null : goal.getId(),
                goal == null ? null : goal.getName(),
                row.getGroupId());
    }

    /** "general savings" or the goal's own name, for messages aimed at the user. */
    private static String categoryName(SavingsGoal goal) {
        return goal == null ? "general savings" : goal.getName();
    }

    /**
     * Turns the hashtag from the entry box into a goal, creating it the first
     * time it is mentioned. Matching is case-insensitive, so "#Laptop" and
     * "#laptop" always land on the same goal.
     */
    public SavingsGoal resolveGoal(User user, String rawName) {
        String name = normaliseGoalName(rawName);
        if (name == null) {
            return null;
        }
        return goalRepository.findByUserAndNameIgnoreCase(user, name)
                .orElseGet(() -> {
                    SavingsGoal created = new SavingsGoal();
                    created.setUser(user);
                    created.setName(name);
                    created.setStatus(SavingsGoal.STATUS_ACTIVE);
                    return goalRepository.save(created);
                });
    }

    /** "#laptop", " laptop " and "#New Phone" all normalise to a plain name. */
    static String normaliseGoalName(String raw) {
        if (raw == null) {
            return null;
        }
        String cleaned = raw.trim().replaceFirst("^#+", "").trim().replaceAll("\\s+", "-");
        if (cleaned.isEmpty()) {
            return null;
        }
        if (cleaned.length() > 120) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "That goal name is too long — keep it under 120 characters.");
        }
        return cleaned;
    }

    /**
     * A tagged withdrawal may only take what that goal holds; an untagged one
     * may only take what the jar holds.
     */
    private void ensureWithdrawable(User user, SavingsGoal goal, BigDecimal amount) {
        BigDecimal balance = summaryService.balanceOf(user);
        if (amount.compareTo(balance) > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "You only have ₹" + balance.toPlainString() + " in your gullak");
        }
        if (goal != null) {
            BigDecimal saved = summaryService.goalBalanceOf(user, goal);
            if (amount.compareTo(saved) > 0) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Only ₹" + saved.toPlainString() + " is saved in " + goal.getName()
                                + ". Withdraw the rest from your general savings.");
            }
        }
    }

    private SavingsGoal requireGoal(User user, String goal) {
        try {
            return requireGoal(user, Long.valueOf(goal.trim()));
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("Unknown savings goal: " + goal);
        }
    }

    private SavingsGoal requireGoal(User user, Long goalId) {
        return goalRepository.findByIdAndUser(goalId, user)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That goal no longer exists."));
    }

    private enum GoalFilter { ALL, GENERAL, GOAL }

    private GoalFilter goalFilter(String goal) {
        if (goal == null || goal.isBlank() || "all".equalsIgnoreCase(goal.trim())) {
            return GoalFilter.ALL;
        }
        return "general".equalsIgnoreCase(goal.trim()) ? GoalFilter.GENERAL : GoalFilter.GOAL;
    }

    /** What this row currently adds to (or removes from) its balance. */
    private BigDecimal contributionOf(SavingsTransaction row) {
        BigDecimal amount = SavingsSummaryService.scale(row.getAmount());
        return row.getType() == SavingsType.DEPOSIT ? amount : amount.negate();
    }

    /** Accepts "deposit"/"DEPOSIT"/" withdrawal " but nothing else. */
    private SavingsType parseType(String raw) {
        if (raw != null) {
            String value = raw.trim().toUpperCase();
            if ("DEPOSIT".equals(value)) {
                return SavingsType.DEPOSIT;
            }
            if ("WITHDRAWAL".equals(value)) {
                return SavingsType.WITHDRAWAL;
            }
        }
        throw new IllegalArgumentException("Choose deposit or withdrawal");
    }

    /** Same parsing rules as {@link #parseType} but for the list filter. */
    private SavingsType parseFilter(String raw) {
        String value = raw.trim().toUpperCase();
        if ("DEPOSIT".equals(value)) {
            return SavingsType.DEPOSIT;
        }
        if ("WITHDRAWAL".equals(value)) {
            return SavingsType.WITHDRAWAL;
        }
        throw new IllegalArgumentException("Unknown transaction type: " + raw);
    }

    private static String normaliseNote(String note) {
        return note == null || note.isBlank() ? null : note.trim();
    }
}
