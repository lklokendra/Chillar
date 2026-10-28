package com.coin.exception;

/**
 * Shape of every error payload the API returns.
 */
public record ApiError(int status, String error, String message) {
}
