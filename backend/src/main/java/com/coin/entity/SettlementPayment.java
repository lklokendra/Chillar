package com.coin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * One instalment of a {@link SplitSettlement}. Keeping every hand-over as its own
 * row is what makes partial payments and the audit trail possible: the settled
 * total is the sum of these rows, never a value typed over the settlement.
 */
@Entity
@Table(name = "settlement_payments")
public class SettlementPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "settlement_id", nullable = false)
    private SplitSettlement settlement;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    // When the money actually changed hands (defaults to today).
    @Column(name = "paid_at", nullable = false)
    private LocalDate paidAt = LocalDate.now();

    @Column(length = 255)
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public SplitSettlement getSettlement() { return settlement; }
    public void setSettlement(SplitSettlement settlement) { this.settlement = settlement; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public LocalDate getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDate paidAt) { this.paidAt = paidAt; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
