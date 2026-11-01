package com.coin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

/**
 * One instalment against a settlement. {@code amount} may be omitted, in which
 * case the whole outstanding remainder is paid (the "mark as paid" gesture).
 */
public record SettlementPaymentRequest(
    @DecimalMin(value = "0.01", message = "Payment must be greater than zero")
    BigDecimal amount,

    LocalDate paidAt,

    @Size(max = 255)
    String note
) {}
