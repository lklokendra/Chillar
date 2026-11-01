package com.coin.dto;

import java.math.BigDecimal;

/**
 * The gullak at a glance.
 *
 * <p>{@code balance} is always {@code totalDeposits - totalWithdrawals}, and it
 * always equals {@code goalsTotal + generalSavings} — the same rupees are never
 * counted in two places.
 */
public record GullakSummaryResponse(
    BigDecimal balance,
    BigDecimal totalDeposits,
    BigDecimal totalWithdrawals,
    long transactionCount,
    BigDecimal generalSavings,
    BigDecimal goalsTotal,
    long goalCount
) {}
