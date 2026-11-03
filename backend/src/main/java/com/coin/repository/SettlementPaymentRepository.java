package com.coin.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.coin.entity.SettlementPayment;
import com.coin.entity.SplitSettlement;

public interface SettlementPaymentRepository extends JpaRepository<SettlementPayment, Long> {

    List<SettlementPayment> findBySettlementOrderByPaidAtAscCreatedAtAsc(SplitSettlement settlement);

    Optional<SettlementPayment> findByIdAndSettlement(Long id, SplitSettlement settlement);

    // Stops the same instalment being submitted twice (double-click, retry).
    boolean existsBySettlementAndAmountAndPaidAt(SplitSettlement settlement, BigDecimal amount, LocalDate paidAt);

    // One query for a whole group's settlements, so the dashboard never fires a
    // query per settlement.
    @Query("SELECT p FROM SettlementPayment p WHERE p.settlement IN :settlements "
            + "ORDER BY p.paidAt ASC, p.createdAt ASC")
    List<SettlementPayment> findBySettlements(@Param("settlements") List<SplitSettlement> settlements);
}
