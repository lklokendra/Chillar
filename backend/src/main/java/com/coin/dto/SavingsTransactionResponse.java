package com.coin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record SavingsTransactionResponse(
    Long id,
    BigDecimal amount,
    String type,
    String note,
    LocalDate date,
    Instant createdAt
) {}
