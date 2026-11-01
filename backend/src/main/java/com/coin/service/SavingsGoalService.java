package com.coin.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.coin.dto.SavingsGoalRequest;
import com.coin.dto.SavingsGoalResponse;
import com.coin.entity.SavingsGoal;
import com.coin.entity.SavingsTransaction;
import com.coin.entity.User;
import com.coin.exception.ApiException;
import com.coin.repository.SavingsGoalRepository;
import com.coin.repository.SavingsTransactionRepository;

/**
 * Savings goals and their dashboards.
 *
 * <p>A goal owns no money. Its "saved" figure is recomputed from the gullak
 * ledger every time it is read, which is why editing or deleting a transaction
 * instantly moves every goal's progress too.
 */
@Service
public class SavingsGoalService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    private final SavingsGoalRepository goalRepository;
    private final SavingsTransactionRepository savingsRepository;
    private final SavingsSummaryService summaryService;

    public SavingsGoalService(SavingsGoalRepository goalRepository,
                              SavingsTransactionRepository savingsRepository,
                              SavingsSummaryService summaryService) {
        this.goalRepository = goalRepository;
        this.savingsRepository = savingsRepository;
        this.summaryService = summaryService;
    }

    @Transactional(readOnly = true)
    public List<SavingsGoalResponse> list(User user) {
        return goalRepository.findByUserOrderByCreatedAtAsc(user).stream()
                .map(goal -> toResponse(user, goal))
                .toList();
    }

    /** The individual goal dashboard header, cards and progress in one payload. */
    @Transactional(readOnly = true)
    public SavingsGoalResponse summary(User user, Long goalId) {
        return toResponse(user, require(user, goalId));
    }

    @Transactional(readOnly = true)
    public SavingsGoalResponse detail(User user, Long goalId) {
        return summary(user, goalId);
    }

    @Transactional
    public SavingsGoalResponse create(User user, SavingsGoalRequest request) {
        String name = clean(request.name());
        if (name == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Give your goal a name.");
        }
        goalRepository.findByUserAndNameIgnoreCase(user, name).ifPresent(existing -> {
            throw new ApiException(HttpStatus.CONFLICT,
                    "You already have a goal called " + existing.getName() + ".");
        });

        SavingsGoal goal = new SavingsGoal();
        goal.setUser(user);
        apply(goal, request, name);
        return toResponse(user, goalRepository.save(goal));
    }

    @Transactional
    public SavingsGoalResponse update(User user, Long goalId, SavingsGoalRequest request) {
        SavingsGoal goal = require(user, goalId);
        String name = clean(request.name());
        if (name == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Give your goal a name.");
        }

        goalRepository.findByUserAndNameIgnoreCase(user, name)
                .filter(other -> !other.getId().equals(goal.getId()))
                .ifPresent(other -> {
                    throw new ApiException(HttpStatus.CONFLICT,
                            "You already have a goal called " + other.getName() + ".");
                });

        apply(goal, request, name);
        return toResponse(user, goalRepository.save(goal));
    }

    /**
     * Removes the goal but never its history: the transactions that pointed at
     * it become general savings, so the overall balance and every audit trail
     * survive untouched. Deleting the goal can therefore never move money.
     */
    @Transactional
    public void delete(User user, Long goalId) {
        SavingsGoal goal = require(user, goalId);

        List<SavingsTransaction> rows = savingsRepository.findAllByUserAndGoal(user, goal);
        rows.forEach(row -> row.setGoal(null));
        savingsRepository.saveAll(rows);

        goalRepository.delete(goal);
    }

    /** Loads a goal the caller actually owns, or 404s. */
    @Transactional(readOnly = true)
    public SavingsGoal require(User user, Long goalId) {
        return goalRepository.findByIdAndUser(goalId, user)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "That goal no longer exists."));
    }

    /** Fills in the editable fields. Historical transactions are never touched. */
    private void apply(SavingsGoal goal, SavingsGoalRequest request, String name) {
        goal.setName(name);
        goal.setDescription(clean(request.description()));
        goal.setTargetAmount(request.targetAmount() == null
                ? null
                : SavingsSummaryService.scale(request.targetAmount()));
        goal.setTargetDate(request.targetDate());
        goal.setIcon(clean(request.icon()));
        goal.setColor(clean(request.color()));
        goal.setStatus(statusOf(request.status()));
    }

    /** Only ACTIVE and ARCHIVED are stored; COMPLETED is always derived. */
    private static String statusOf(String raw) {
        String value = raw == null ? "" : raw.trim().toUpperCase();
        return SavingsGoal.STATUS_ARCHIVED.equals(value)
                ? SavingsGoal.STATUS_ARCHIVED
                : SavingsGoal.STATUS_ACTIVE;
    }

    private SavingsGoalResponse toResponse(User user, SavingsGoal goal) {
        BigDecimal saved = summaryService.goalBalanceOf(user, goal);
        BigDecimal target = goal.getTargetAmount() == null
                ? null
                : SavingsSummaryService.scale(goal.getTargetAmount());

        BigDecimal remaining = null;
        BigDecimal progress = null;
        if (target != null && target.compareTo(BigDecimal.ZERO) > 0) {
            remaining = SavingsSummaryService.scale(target.subtract(saved).max(BigDecimal.ZERO));
            progress = saved.multiply(HUNDRED)
                    .divide(target, 1, RoundingMode.HALF_UP)
                    .max(BigDecimal.ZERO)
                    .min(HUNDRED);
        }

        String status = SavingsGoal.STATUS_ARCHIVED.equals(goal.getStatus())
                ? SavingsGoal.STATUS_ARCHIVED
                : (target != null && saved.compareTo(target) >= 0
                        ? SavingsGoal.STATUS_COMPLETED
                        : SavingsGoal.STATUS_ACTIVE);

        return new SavingsGoalResponse(
                goal.getId(),
                goal.getName(),
                goal.getDescription(),
                target,
                goal.getTargetDate(),
                goal.getIcon(),
                goal.getColor(),
                status,
                saved,
                remaining,
                progress,
                savingsRepository.countByUserAndGoal(user, goal),
                goal.getCreatedAt(),
                goal.getUpdatedAt());
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
