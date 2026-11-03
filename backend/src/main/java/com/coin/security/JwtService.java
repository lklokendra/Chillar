package com.coin.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * Creates and verifies the HS256 access tokens handed to clients after login.
 *
 * <p>Two lifetimes exist and "Remember me" picks between them: a short default
 * for an ordinary visit and a long one for a browser the user asked us to
 * remember. Nothing about the credential is stored differently — only the
 * {@code exp} claim changes.</p>
 */
@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMinutes;
    private final long rememberMeExpirationMinutes;

    public JwtService(@Value("${coin.jwt.secret}") String secret,
                      @Value("${coin.jwt.expiration-minutes}") long expirationMinutes,
                      @Value("${coin.jwt.remember-me-expiration-minutes}") long rememberMeExpirationMinutes) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = expirationMinutes;
        this.rememberMeExpirationMinutes = rememberMeExpirationMinutes;
    }

    /** The lifetime, in minutes, that a token issued right now would carry. */
    public long lifetimeMinutes(boolean rememberMe) {
        return rememberMe ? rememberMeExpirationMinutes : expirationMinutes;
    }

    public String generateToken(String email, String role, boolean rememberMe) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(email)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(lifetimeMinutes(rememberMe), ChronoUnit.MINUTES)))
                .signWith(signingKey)
                .compact();
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            Claims claims = parseClaims(token);
            return claims.getSubject().equalsIgnoreCase(userDetails.getUsername())
                    && claims.getExpiration().after(new Date());
        } catch (Exception ex) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
