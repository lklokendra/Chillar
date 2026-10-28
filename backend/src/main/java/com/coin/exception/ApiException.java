package com.coin.exception;

import org.springframework.http.HttpStatus;

/**
 * Thrown when a request cannot be fulfilled for a known business reason.
 * The status is mapped straight onto the HTTP response.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
