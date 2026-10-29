package com.coin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransactionResponse(
    Long id,
    BigDecimal amount,
    String note,
    String categoryName,
    LocalDate date
) {}
