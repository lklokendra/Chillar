package com.coin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record SettlementPaymentResponse(
    Long id,
    BigDecimal amount,
    LocalDate paidAt,
    String note,
    Instant createdAt
) {}
