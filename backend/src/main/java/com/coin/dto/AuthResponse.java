package com.coin.dto;

public record AuthResponse(String token, String tokenType, long expiresInMinutes, UserResponse user) {

    public static AuthResponse bearer(String token, long expiresInMinutes, UserResponse user) {
        return new AuthResponse(token, "Bearer", expiresInMinutes, user);
    }
}
