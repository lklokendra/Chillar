package com.coin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * One gullak ledger row. {@code goalId}/{@code goalName} are null for general
 * savings — money the user has not earmarked for any named goal.
 *
 * <p>{@code groupId} is null for an ordinary entry. Rows created by a single
 * split withdrawal share one {@code groupId}, which is how the UI folds them
 * back into one logical transaction.
 */
public record SavingsTransactionResponse(
    Long id,
    BigDecimal amount,
    String type,
    String note,
    LocalDate date,
    Instant createdAt,
    Long goalId,
    String goalName,
    String groupId
) {}
