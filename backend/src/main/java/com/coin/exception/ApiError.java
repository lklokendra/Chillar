package com.coin.exception;

import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Shape of every error payload the API returns.
 *
 * <p>{@code fieldErrors} is populated only for request-body validation failures;
 * it lets the frontend place a message under the exact input that caused it
 * instead of showing one generic banner.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(int status, String error, String message, Map<String, String> fieldErrors) {

    public ApiError(int status, String error, String message) {
        this(status, error, message, null);
    }
}
