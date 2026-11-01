package com.coin.dto;

import java.time.Instant;

public record SettlementAuditResponse(
    Long id,
    Long settlementId,
    String action,
    String detail,
    Instant createdAt
) {}
