package com.coin.security;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * A small in-memory sliding-window limiter for the credential endpoints.
 *
 * <p>Login and password-reset are the only places where guessing pays off, so
 * they get a per-client budget. State lives in this process only — a restart
 * clears it, and a multi-instance deployment would need a shared store. That is
 * an acceptable trade for a single-node app and avoids adding a dependency.</p>
 */
@Component
public class AuthRateLimiter {

    private final Map<String, Deque<Instant>> attempts = new ConcurrentHashMap<>();
    private final int maxAttempts;
    private final Duration window;

    public AuthRateLimiter(@Value("${coin.auth.rate-limit.max-attempts}") int maxAttempts,
                           @Value("${coin.auth.rate-limit.window-seconds}") long windowSeconds) {
        this.maxAttempts = maxAttempts;
        this.window = Duration.ofSeconds(windowSeconds);
    }

    /**
     * Records one attempt for {@code key} and reports whether it is allowed.
     *
     * @return {@code true} while the caller is under the limit
     */
    public boolean tryConsume(String key) {
        Instant now = Instant.now();
        Instant cutoff = now.minus(window);

        Deque<Instant> hits = attempts.computeIfAbsent(key, ignored -> new ArrayDeque<>());
        synchronized (hits) {
            while (!hits.isEmpty() && hits.peekFirst().isBefore(cutoff)) {
                hits.pollFirst();
            }
            if (hits.size() >= maxAttempts) {
                return false;
            }
            hits.addLast(now);
            return true;
        }
    }
}
