package com.coin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Create or edit a savings goal. Only the name is mandatory: goals are usually
 * born from a hashtag, and a brand new one has no target until the user sets
 * one here.
 */
public record SavingsGoalRequest(
        @NotBlank(message = "Give your goal a name")
        @Size(max = 120, message = "Goal name is too long")
        String name,

        @Size(max = 500, message = "Description is too long")
        String description,

        @DecimalMin(value = "0.01", message = "Target must be greater than zero")
        @Digits(integer = 17, fraction = 2, message = "Target can have at most 2 decimal places")
        BigDecimal targetAmount,

        LocalDate targetDate,

        @Size(max = 16, message = "Icon is too long")
        String icon,

        @Size(max = 20, message = "Colour is too long")
        String color,

        /** ACTIVE or ARCHIVED; COMPLETED is derived from the numbers. */
        String status) {
}
