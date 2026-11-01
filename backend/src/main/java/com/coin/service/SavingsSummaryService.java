package com.coin.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.coin.dto.GullakSummaryResponse;
import com.coin.entity.SavingsGoal;
import com.coin.entity.SavingsType;
import com.coin.entity.User;
import com.coin.repository.SavingsGoalRepository;
import com.coin.repository.SavingsTransactionRepository;

/**
 * Every gullak number the app shows comes from here, so the maths lives in
 * exactly one place.
 *
 * <p>Nothing is ever stored: the ledger is the single source of truth.
 * <ul>
 *   <li>overall = deposits − withdrawals</li>
 *   <li>goal balance = that goal's deposits − that goal's withdrawals</li>
 *   <li>general savings = untagged deposits − untagged withdrawals</li>
 * </ul>
 * Because every row is either tagged or untagged, overall = Σ goal balances +
 * general savings, always. An amount is never counted twice.
 */
@Service
public class SavingsSummaryService {

    private final SavingsTransactionRepository savingsRepository;
    private final SavingsGoalRepository goalRepository;

    public SavingsSummaryService(SavingsTransactionRepository savingsRepository,
                                 SavingsGoalRepository goalRepository) {
        this.savingsRepository = savingsRepository;
        this.goalRepository = goalRepository;
    }

    @Transactional(readOnly = true)
    public GullakSummaryResponse summary(User user) {
        BigDecimal deposits = depositsOf(user);
        BigDecimal withdrawals = withdrawalsOf(user);
        BigDecimal general = generalBalanceOf(user);

        List<SavingsGoal> goals = goalRepository.findByUserOrderByCreatedAtAsc(user);
        BigDecimal goalsTotal = goals.stream()
                .map(goal -> goalBalanceOf(user, goal))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new GullakSummaryResponse(
                scale(deposits.subtract(withdrawals)),
                deposits,
                withdrawals,
                transactionCount(user),
                general,
                scale(goalsTotal),
                goals.size());
    }

    /**
     * How many logical entries the ledger holds. A split withdrawal may be
     * several rows (one per category) but it is one thing the user did, so it
     * is counted once.
     */
    @Transactional(readOnly = true)
    public long transactionCount(User user) {
        return savingsRepository.countByUserAndGroupIdIsNull(user) + savingsRepository.countGroupsByUser(user);
    }

    @Transactional(readOnly = true)
    public BigDecimal depositsOf(User user) {
        return scale(savingsRepository.sumAmountByUserAndType(user, SavingsType.DEPOSIT));
    }

    @Transactional(readOnly = true)
    public BigDecimal withdrawalsOf(User user) {
        return scale(savingsRepository.sumAmountByUserAndType(user, SavingsType.WITHDRAWAL));
    }

    /** Deposits minus withdrawals across the whole jar. */
    @Transactional(readOnly = true)
    public BigDecimal balanceOf(User user) {
        return scale(depositsOf(user).subtract(withdrawalsOf(user)));
    }

    /** What is saved against one goal. A null goal means general savings. */
    @Transactional(readOnly = true)
    public BigDecimal goalBalanceOf(User user, SavingsGoal goal) {
        if (goal == null) {
            return generalBalanceOf(user);
        }
        BigDecimal in = scale(savingsRepository.sumAmountByUserAndGoalAndType(user, goal, SavingsType.DEPOSIT));
        BigDecimal out = scale(savingsRepository.sumAmountByUserAndGoalAndType(user, goal, SavingsType.WITHDRAWAL));
        return scale(in.subtract(out));
    }

    /** Money in the jar that no goal claims. */
    @Transactional(readOnly = true)
    public BigDecimal generalBalanceOf(User user) {
        BigDecimal in = scale(savingsRepository.sumAmountByUserAndNoGoalAndType(user, SavingsType.DEPOSIT));
        BigDecimal out = scale(savingsRepository.sumAmountByUserAndNoGoalAndType(user, SavingsType.WITHDRAWAL));
        return scale(in.subtract(out));
    }

    /** Two-decimal money, the only scale the app ever works with. */
    public static BigDecimal scale(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }
}
