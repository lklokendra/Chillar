package com.coin.dto;

import java.math.BigDecimal;

public record KharchResponse(
    Long id,
    String name,
    BigDecimal total,
    String color
) {}
