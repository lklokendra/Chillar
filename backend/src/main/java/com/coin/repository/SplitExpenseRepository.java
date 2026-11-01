package com.coin.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.coin.entity.SplitExpense;
import com.coin.entity.SplitGroup;
import com.coin.entity.SplitParticipant;

public interface SplitExpenseRepository extends JpaRepository<SplitExpense, Long> {

    // The paying participant is fetched eagerly here because the response needs
    // its name and serialisation happens outside the persistence context.
    @Query("SELECT e FROM SplitExpense e JOIN FETCH e.participant "
            + "WHERE e.group = :group ORDER BY e.date DESC, e.createdAt DESC")
    List<SplitExpense> findByGroupWithParticipant(@Param("group") SplitGroup group);

    Optional<SplitExpense> findByIdAndGroup(Long id, SplitGroup group);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM SplitExpense e WHERE e.group = :group")
    BigDecimal sumAmountByGroup(@Param("group") SplitGroup group);

    long countByParticipant(SplitParticipant participant);
}
