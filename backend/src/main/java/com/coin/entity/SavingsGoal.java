package com.coin.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * A named savings goal inside the gullak — what a "#laptop" or "#goa" hashtag
 * means. A goal holds no money of its own: everything "saved" toward it is the
 * sum of the {@link SavingsTransaction} rows that point at it, so the ledger
 * stays the single source of truth and no rupee is ever counted twice.
 *
 * <p>Both {@code targetAmount} and {@code targetDate} are optional, because the
 * goal may be created automatically the moment a new hashtag is typed and can be
 * configured later from the goal dashboard.
 */
@Entity
@Table(name = "savings_goals")
public class SavingsGoal {

    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_COMPLETED = "COMPLETED";
    public static final String STATUS_ARCHIVED = "ARCHIVED";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 500)
    private String description;

    /** Null until the user configures one; a goal can exist without a target. */
    @Column(name = "target_amount", precision = 19, scale = 2)
    private BigDecimal targetAmount;

    @Column(name = "target_date")
    private LocalDate targetDate;

    /** A short emoji or glyph shown on the goal card. */
    @Column(length = 16)
    private String icon;

    /** Accent tone used by the UI: mint, amber, indigo or rose. */
    @Column(length = 20)
    private String color;

    @Column(nullable = false, length = 20)
    private String status = STATUS_ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PreUpdate
    void touch() {
        this.updatedAt = Instant.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getTargetAmount() { return targetAmount; }
    public void setTargetAmount(BigDecimal targetAmount) { this.targetAmount = targetAmount; }

    public LocalDate getTargetDate() { return targetDate; }
    public void setTargetDate(LocalDate targetDate) { this.targetDate = targetDate; }

    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
