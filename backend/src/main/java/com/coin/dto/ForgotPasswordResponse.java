package com.coin.dto;

/**
 * Deliberately does not say whether the address is registered.
 *
 * <p>{@code resetToken} is echoed back only because Paise has no mail transport
 * yet, and only when a matching account exists; the UI uses it to render the
 * one-time link on screen. With a real mailer this field would be dropped and
 * the caller would always get just {@code message}.</p>
 */
public record ForgotPasswordResponse(String message, String resetToken, long expiresInMinutes) {
}
