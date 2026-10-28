package com.coin.entity;

/**
 * Authorities granted to a Chillar account.
 * Spring Security prefixes these with "ROLE_" when loading authorities.
 */
public enum Role {
    USER,
    ADMIN
}
