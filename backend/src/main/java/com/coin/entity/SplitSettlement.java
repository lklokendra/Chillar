package com.coin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * A settlement that really happened (or is expected to happen) between two
 * participants of a group.
 *
 * <p>This must not be confused with the <em>suggested</em> settlement
 * instructions: those are recomputed from the net balances on every read and are
 * never stored. A {@code SplitSettlement} row is a record of a real-world
 * agreement, so editing or deleting an expense never rewrites it. When a balance
 * changes the group is merely flagged for reconciliation.
 *
 * <p>The {@link #status} is always derived from the sum of the settlement's
 * payments, so a partially paid settlement can never silently look paid.
 */
@Entity
@Table(name = "split_settlements")
public class SplitSettlement {

    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_PARTIALLY_PAID = "PARTIALLY_PAID";
    public static final String STATUS_PAID = "PAID";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private SplitGroup group;

    // Who hands the money over.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payer_id", nullable = false)
    private SplitParticipant payer;

    // Who receives it.
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "receiver_id", nullable = false)
    private SplitParticipant receiver;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate date = LocalDate.now();

    // PENDING | PARTIALLY_PAID | PAID - always recomputed from the payments.
    @Column(nullable = false, length = 20)
    private String status = STATUS_PENDING;

    @Column(length = 255)
    private String note;

    @OneToMany(mappedBy = "settlement", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SettlementPayment> payments = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public SplitGroup getGroup() { return group; }
    public void setGroup(SplitGroup group) { this.group = group; }

    public SplitParticipant getPayer() { return payer; }
    public void setPayer(SplitParticipant payer) { this.payer = payer; }

    public SplitParticipant getReceiver() { return receiver; }
    public void setReceiver(SplitParticipant receiver) { this.receiver = receiver; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public List<SettlementPayment> getPayments() { return payments; }
    public void setPayments(List<SettlementPayment> payments) { this.payments = payments; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
