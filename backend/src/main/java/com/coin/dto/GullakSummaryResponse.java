package com.coin.dto;

import java.math.BigDecimal;

public record GullakSummaryResponse(
    BigDecimal balance,
    BigDecimal totalDeposits,
    BigDecimal totalWithdrawals,
    long transactionCount
) {}
