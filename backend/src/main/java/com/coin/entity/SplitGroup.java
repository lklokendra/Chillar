package com.coin.entity;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "split_groups")
public class SplitGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 255)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // The cascades let a whole group be deleted (participants + expenses) in one call.
    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SplitParticipant> participants = new ArrayList<>();

    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SplitExpense> expenses = new ArrayList<>();

    // Recorded settlements and their audit trail. Both cascade so deleting a
    // group cleans up after itself.
    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SplitSettlement> settlements = new ArrayList<>();

    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SettlementAuditLog> settlementAuditLogs = new ArrayList<>();

    // Set when an expense changes while settlement records exist, so the user is
    // told to review them instead of us silently rewriting (or dropping) records.
    @Column(name = "needs_reconciliation", nullable = false)
    private boolean needsReconciliation = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public List<SplitParticipant> getParticipants() { return participants; }
    public void setParticipants(List<SplitParticipant> participants) { this.participants = participants; }

    public List<SplitExpense> getExpenses() { return expenses; }
    public void setExpenses(List<SplitExpense> expenses) { this.expenses = expenses; }

    public List<SplitSettlement> getSettlements() { return settlements; }
    public void setSettlements(List<SplitSettlement> settlements) { this.settlements = settlements; }

    public List<SettlementAuditLog> getSettlementAuditLogs() { return settlementAuditLogs; }
    public void setSettlementAuditLogs(List<SettlementAuditLog> settlementAuditLogs) { this.settlementAuditLogs = settlementAuditLogs; }

    public boolean isNeedsReconciliation() { return needsReconciliation; }
    public void setNeedsReconciliation(boolean needsReconciliation) { this.needsReconciliation = needsReconciliation; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
