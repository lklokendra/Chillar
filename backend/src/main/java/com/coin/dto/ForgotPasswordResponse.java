package com.coin.dto;

/**
 * {@code resetToken} is returned to the client only because Chillar has no mail
 * transport yet; the UI shows the link on screen instead of emailing it.
 */
public record ForgotPasswordResponse(String message, String resetToken, long expiresInMinutes) {
}
