package com.coin.dto;

import java.math.BigDecimal;
import java.time.Instant;

public record SplitGroupResponse(
    Long id,
    String name,
    String description,
    long participantCount,
    long expenseCount,
    BigDecimal totalExpense,
    Instant createdAt
) {}
