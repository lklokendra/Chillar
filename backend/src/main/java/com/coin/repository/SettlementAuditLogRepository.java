package com.coin.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.coin.entity.SettlementAuditLog;
import com.coin.entity.SplitGroup;

public interface SettlementAuditLogRepository extends JpaRepository<SettlementAuditLog, Long> {

    List<SettlementAuditLog> findTop50ByGroupOrderByCreatedAtDesc(SplitGroup group);
}
