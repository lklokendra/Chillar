package com.coin.dto;

import java.math.BigDecimal;

public record ParticipantSummaryResponse(
    Long id,
    String name,
    BigDecimal paid,
    BigDecimal fairShare,
    BigDecimal netBalance
) {}
