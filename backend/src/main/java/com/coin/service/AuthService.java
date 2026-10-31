package com.coin.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.coin.dto.AuthResponse;
import com.coin.dto.ForgotPasswordRequest;
import com.coin.dto.ForgotPasswordResponse;
import com.coin.dto.LoginRequest;
import com.coin.dto.MessageResponse;
import com.coin.dto.RegisterRequest;
import com.coin.dto.ResetPasswordRequest;
import com.coin.dto.UserResponse;
import com.coin.entity.PasswordResetToken;
import com.coin.entity.Role;
import com.coin.entity.User;
import com.coin.exception.ApiException;
import com.coin.repository.PasswordResetTokenRepository;
import com.coin.repository.UserRepository;
import com.coin.security.JwtService;

@Service
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository resetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final long resetExpirationMinutes;

    public AuthService(UserRepository userRepository,
                       PasswordResetTokenRepository resetTokenRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService,
                       @Value("${coin.password-reset.expiration-minutes}") long resetExpirationMinutes) {
        this.userRepository = userRepository;
        this.resetTokenRepository = resetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.resetExpirationMinutes = resetExpirationMinutes;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());

        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "That email is already registered");
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(Role.USER);
        userRepository.save(user);

        return issueToken(user);
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());

        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));
        } catch (AuthenticationException ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Incorrect email or password");
        }

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Incorrect email or password"));

        return issueToken(user);
    }

    /**
     * Spins up a throwaway account so "continue as guest" still gets a real
     * bearer token and its entries land in the database like any other user.
     */
    @Transactional
    public AuthResponse guest() {
        User user = new User();
        user.setName("Guest");
        user.setEmail("guest-" + UUID.randomUUID() + "@chillar.local");
        user.setPasswordHash(passwordEncoder.encode(UUID.randomUUID().toString()));
        user.setRole(Role.USER);
        userRepository.save(user);

        return issueToken(user);
    }

    @Transactional(readOnly = true)
    public UserResponse currentUser(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Account no longer exists"));
        return toResponse(user);
    }

    /**
     * Issues a single-use reset token. Chillar has no mail transport yet, so the
     * token travels back to the client and the UI renders the link on screen.
     */
    @Transactional
    public ForgotPasswordResponse forgotPassword(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No Chillar account uses that email"));

        // Any earlier link stops working the moment a new one is asked for.
        resetTokenRepository.deleteByUser(user);

        PasswordResetToken reset = new PasswordResetToken();
        reset.setToken(generateResetToken());
        reset.setUser(user);
        reset.setExpiresAt(Instant.now().plus(resetExpirationMinutes, ChronoUnit.MINUTES));
        resetTokenRepository.save(reset);

        return new ForgotPasswordResponse(
                "Reset link ready. It expires in " + resetExpirationMinutes + " minutes.",
                reset.getToken(),
                resetExpirationMinutes);
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        PasswordResetToken reset = resetTokenRepository.findByToken(request.token().trim())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "That reset link is not valid"));

        if (!reset.isUsable(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "That reset link has expired or was already used");
        }

        User user = reset.getUser();
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);

        reset.setUsedAt(Instant.now());
        resetTokenRepository.save(reset);

        return new MessageResponse("Password updated. You can sign in now.");
    }

    private String generateResetToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private AuthResponse issueToken(User user) {
        String token = jwtService.generateToken(user.getEmail(), user.getRole().name());
        return AuthResponse.bearer(token, jwtService.getExpirationMinutes(), toResponse(user));
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getRole().name());
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
