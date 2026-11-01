package com.coin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * An actual settlement record. {@code amount} is the agreed figure, {@code paidAmount}
 * the sum of its instalments and {@code remaining} what is still outstanding;
 * {@code status} is derived from those two so it can never disagree with them.
 */
public record SplitSettlementResponse(
    Long id,
    Long groupId,
    Long payerId,
    String payerName,
    Long receiverId,
    String receiverName,
    BigDecimal amount,
    BigDecimal paidAmount,
    BigDecimal remaining,
    LocalDate date,
    String status,
    String note,
    List<SettlementPaymentResponse> payments,
    Instant createdAt,
    Instant updatedAt
) {}
