package com.coin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * {@code rememberMe} only selects which token lifetime is issued; no credential
 * or session secret is ever kept anywhere else because of it.
 */
public record LoginRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Enter a valid email address")
        String email,

        @NotBlank(message = "Password is required")
        String password,

        Boolean rememberMe) {
}
