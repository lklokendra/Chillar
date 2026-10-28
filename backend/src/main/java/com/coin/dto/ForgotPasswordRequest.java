package com.coin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email address")
        @Size(max = 160, message = "Email is too long")
        String email) {
}
