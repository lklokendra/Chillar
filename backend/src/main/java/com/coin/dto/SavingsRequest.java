package com.coin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SavingsRequest(
        @NotNull(message = "Amount is required")
        @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
        @Digits(integer = 17, fraction = 2, message = "Amount can have at most 2 decimal places")
        BigDecimal amount,

        @NotBlank(message = "Choose deposit or withdrawal")
        String type,

        @Size(max = 255, message = "Note is too long")
        String note,

        LocalDate date) {
}
