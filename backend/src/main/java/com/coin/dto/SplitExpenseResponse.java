package com.coin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SplitExpenseResponse(
    Long id,
    String title,
    BigDecimal amount,
    Long participantId,
    String participantName,
    LocalDate date
) {}
