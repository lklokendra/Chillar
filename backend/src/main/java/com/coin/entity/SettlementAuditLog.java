package com.coin.entity;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Append-only trail of everything that touched a group's settlement records
 * (records created, payments added or removed, records deleted, balances changed
 * and groups reconciled). {@code settlementId} is stored as a plain number rather
 * than an association so the entry survives the deletion of the settlement it
 * describes.
 */
@Entity
@Table(name = "settlement_audit_logs")
public class SettlementAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private SplitGroup group;

    @Column(name = "settlement_id")
    private Long settlementId;

    @Column(nullable = false, length = 40)
    private String action;

    @Column(length = 500)
    private String detail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public SplitGroup getGroup() { return group; }
    public void setGroup(SplitGroup group) { this.group = group; }

    public Long getSettlementId() { return settlementId; }
    public void setSettlementId(Long settlementId) { this.settlementId = settlementId; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
