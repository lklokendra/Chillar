package com.coin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * A withdrawal the user has split across several savings categories, because
 * the category they first named did not hold enough.
 *
 * <p>The server never trusts the shape of this request: it re-reads every
 * balance, re-checks ownership, refuses duplicate categories and insists the
 * allocations add up to exactly {@code totalAmount} before a single row is
 * written.
 */
public record WithdrawalAllocationRequest(
        @NotNull(message = "Withdrawal amount is required")
        @DecimalMin(value = "0.01", message = "Withdrawal amount must be greater than zero")
        @Digits(integer = 17, fraction = 2, message = "Amount can have at most 2 decimal places")
        BigDecimal totalAmount,

        @Size(max = 255, message = "Note is too long")
        String note,

        LocalDate transactionDate,

        @NotEmpty(message = "Choose at least one savings category to withdraw from")
        @Valid
        List<WithdrawalAllocationItem> allocations) {
}
