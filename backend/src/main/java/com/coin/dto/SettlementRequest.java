package com.coin.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Payload for recording a new (initially PENDING) settlement between two people. */
public record SettlementRequest(
    @NotNull(message = "Choose who is paying")
    Long payerId,

    @NotNull(message = "Choose who receives the money")
    Long receiverId,

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    BigDecimal amount,

    LocalDate date,

    @Size(max = 255)
    String note
) {}
