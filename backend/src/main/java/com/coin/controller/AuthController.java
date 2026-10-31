package com.coin.controller;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.coin.dto.AuthResponse;
import com.coin.dto.ForgotPasswordRequest;
import com.coin.dto.ForgotPasswordResponse;
import com.coin.dto.LoginRequest;
import com.coin.dto.MessageResponse;
import com.coin.dto.RegisterRequest;
import com.coin.dto.ResetPasswordRequest;
import com.coin.dto.UserResponse;
import com.coin.service.AuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /** Creates a throwaway account and returns a token for guest browsing. */
    @PostMapping("/guest")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse guest() {
        return authService.guest();
    }

    /** Requires a valid bearer token; used by the frontend to restore a session. */
    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        return authService.currentUser(authentication.getName());
    }

    @PostMapping("/forgot-password")
    public ForgotPasswordResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return authService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return authService.resetPassword(request);
    }
}
