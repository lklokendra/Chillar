package com.coin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SplitGroupRequest(
    @NotBlank(message = "Group name is required")
    @Size(max = 120, message = "Name is too long")
    String name,

    @Size(max = 255, message = "Description is too long")
    String description
) {}
