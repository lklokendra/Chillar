package com.coin.dto;

import java.math.BigDecimal;

/**
 * Per-group settlement roll-up.
 *
 * <p>Keeps the four distinct notions apart, exactly as required:
 * {@code suggestedOutstanding} is what the net balances say should still change
 * hands (recomputed, never stored) while {@code totalOwed}/{@code totalReceived}/
 * {@code totalPending} describe the settlement records that were actually logged.
 */
public record SettlementDashboardResponse(
    BigDecimal totalOwed,
    BigDecimal totalReceived,
    BigDecimal totalPending,
    BigDecimal suggestedOutstanding,
    int totalRecords,
    int completedCount,
    int partialCount,
    int pendingCount,
    boolean needsReconciliation
) {}
