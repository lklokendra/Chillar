package com.coin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record SplitExpenseRequest(
    @NotBlank(message = "Expense title is required")
    @Size(max = 255, message = "Title is too long")
    String title,

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    @Digits(integer = 17, fraction = 2, message = "Amount can have at most 2 decimal places")
    BigDecimal amount,

    @NotNull(message = "Choose who paid")
    Long participantId,

    LocalDate date
) {}
