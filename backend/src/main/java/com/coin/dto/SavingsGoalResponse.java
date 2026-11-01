package com.coin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * A savings goal together with everything derived from the ledger.
 *
 * <p>Nothing here is stored on the goal row: {@code savedAmount} is the sum of
 * the transactions pointing at it, {@code remaining} is
 * {@code max(0, target - saved)} and {@code progressPercent} is
 * {@code clamp(saved / target * 100, 0, 100)}. Both are null when the goal has
 * no target yet, which is normal for a goal just born from a hashtag.
 */
public record SavingsGoalResponse(
    Long id,
    String name,
    String description,
    BigDecimal targetAmount,
    LocalDate targetDate,
    String icon,
    String color,
    String status,
    BigDecimal savedAmount,
    BigDecimal remaining,
    BigDecimal progressPercent,
    long transactionCount,
    Instant createdAt,
    Instant updatedAt
) {}
