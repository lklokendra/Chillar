package com.coin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SplitParticipantRequest(
    @NotBlank(message = "Participant name is required")
    @Size(max = 80, message = "Name is too long")
    String name
) {}
