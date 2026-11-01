package com.coin.dto;

import java.math.BigDecimal;

public record SettlementInstructionResponse(
    Long fromParticipantId,
    String from,
    Long toParticipantId,
    String to,
    BigDecimal amount
) {}
