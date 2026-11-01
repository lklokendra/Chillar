package com.coin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * A deposit or withdrawal typed into the gullak entry box.
 *
 * <p>{@code goal} is the hashtag the user wrote ("#laptop" or "laptop"): the
 * server finds the matching goal or creates it on the spot. Leaving it blank
 * means the row counts as general savings — an untagged entry is never attached
 * to a goal on the user's behalf.
 */
public record SavingsRequest(
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        @Digits(integer = 17, fraction = 2, message = "Amount can have at most 2 decimal places")
        BigDecimal amount,

        @NotBlank(message = "Choose deposit or withdrawal")
        String type,

        @Size(max = 255, message = "Note is too long")
        String note,

        LocalDate date,

        @Size(max = 120, message = "Goal name is too long")
        String goal) {
}
