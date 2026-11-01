package com.coin.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

/**
 * One line of a split withdrawal: how much to take from a single category.
 *
 * <p>A null {@code goalId} means general savings — the untagged part of the jar.
 */
public record WithdrawalAllocationItem(
        /** Null targets general savings. */
        Long goalId,

        @NotNull(message = "Enter an amount for every category")
        @DecimalMin(value = "0.01", message = "Every allocation must be greater than zero")
        @Digits(integer = 17, fraction = 2, message = "Amount can have at most 2 decimal places")
        BigDecimal amount) {
}
