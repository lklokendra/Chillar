package com.coin.validation;

/**
 * The single source of truth for what counts as an acceptable password.
 *
 * <p>The frontend mirrors these rules in {@code passwordPolicy.js} so the live
 * strength meter never promises something the API would reject. Keep the two in
 * step when the policy changes.</p>
 */
public final class PasswordPolicy {

    /** 8-72 characters, at least one lowercase letter, one uppercase letter and one digit. */
    public static final String REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,72}$";

    public static final String MESSAGE =
            "Password must be 8-72 characters and include an uppercase letter, a lowercase letter and a number";

    private PasswordPolicy() {
    }
}
