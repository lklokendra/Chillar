package com.coin.entity;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * A single row in the Gullak ledger. The running balance is never stored: it is
 * always derived by summing these rows (deposits minus withdrawals), so the
 * ledger stays the single source of truth and can never drift out of sync.
 *
 * <p>A row belongs to at most one {@link SavingsGoal}. The goal is what the
 * "#laptop" hashtag in an entry resolves to; rows with no goal are general
 * savings. A goal therefore never has a balance of its own — it is the sum of
 * the rows pointing at it, so no amount is ever counted twice.
 *
 * <p>When one withdrawal is split across several categories, each category
 * gets its own row and all of them share a {@code groupId}. Grouping on the
 * ledger itself (rather than in a separate table) keeps the "balance is the sum
 * of the rows" rule intact while still letting the UI show the split as one
 * logical transaction with its category breakdown.
 */
@Entity
@Table(name = "savings_transactions")
public class SavingsTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SavingsType type;

    @Column(length = 255)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /** Null means general savings — money in the jar that no goal claims. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "goal_id")
    private SavingsGoal goal;

    /**
     * Shared by every row of one split withdrawal; null for an ordinary
     * single-category entry. Rows with the same value belong to one logical
     * transaction.
     */
    @Column(name = "group_id", length = 36)
    private String groupId;

    @Column(nullable = false)
    private LocalDate date = LocalDate.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public SavingsType getType() { return type; }
    public void setType(SavingsType type) { this.type = type; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public SavingsGoal getGoal() { return goal; }
    public void setGoal(SavingsGoal goal) { this.goal = goal; }

    public String getGroupId() { return groupId; }
    public void setGroupId(String groupId) { this.groupId = groupId; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
