package com.coin.dto;

import java.math.BigDecimal;

/**
 * One participant's line in "who owes what".
 *
 * <p>{@code paid} and {@code fairShare} come from the expense ledger;
 * {@code settledOut}/{@code settledIn} are the money that has actually moved
 * through completed settlement instalments. The identity that always holds is
 * {@code netBalance = paid - fairShare - settledOut + settledIn}.
 */
public record ParticipantSummaryResponse(
    Long id,
    String name,
    BigDecimal paid,
    BigDecimal fairShare,
    BigDecimal settledOut,
    BigDecimal settledIn,
    BigDecimal netBalance
) {}
