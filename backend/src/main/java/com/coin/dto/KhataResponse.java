package com.coin.dto;

import java.math.BigDecimal;

public record KhataResponse(
    Long id,
    String name,
    BigDecimal total,
    String color
) {}
