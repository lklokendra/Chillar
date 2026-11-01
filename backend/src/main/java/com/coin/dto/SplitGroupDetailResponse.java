package com.coin.dto;

import java.math.BigDecimal;
import java.util.List;

public record SplitGroupDetailResponse(
    Long id,
    String name,
    String description,
    BigDecimal totalExpense,
    long participantCount,
    BigDecimal equalShare,
    List<SplitParticipantResponse> participants,
    List<ParticipantSummaryResponse> summary,
    List<SettlementInstructionResponse> settlements,
    List<SplitExpenseResponse> expenses,
    List<SplitSettlementResponse> settlementRecords,
    SettlementDashboardResponse settlementDashboard,
    List<SettlementAuditResponse> settlementAudit
) {}
