package com.coin.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.coin.entity.SplitGroup;
import com.coin.entity.SplitParticipant;
import com.coin.entity.SplitSettlement;

import jakarta.persistence.LockModeType;

public interface SplitSettlementRepository extends JpaRepository<SplitSettlement, Long> {

    // Both participants are fetched eagerly: the response needs their names and
    // serialisation happens outside the persistence context (open-in-view off).
    @Query("SELECT s FROM SplitSettlement s JOIN FETCH s.payer JOIN FETCH s.receiver "
            + "WHERE s.group = :group ORDER BY s.date DESC, s.createdAt DESC")
    List<SplitSettlement> findByGroupWithParticipants(@Param("group") SplitGroup group);

    Optional<SplitSettlement> findByIdAndGroup(Long id, SplitGroup group);

    /**
     * Same lookup as {@link #findByIdAndGroup}, but takes a row lock. Recording an
     * instalment has to read the paid-so-far total and then write, so without the
     * lock two simultaneous submissions could both pass the overpayment check.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM SplitSettlement s WHERE s.id = :id AND s.group = :group")
    Optional<SplitSettlement> findByIdAndGroupForUpdate(@Param("id") Long id, @Param("group") SplitGroup group);

    long countByGroup(SplitGroup group);

    // Used to reject recording the exact same hand-over twice.
    boolean existsByGroupAndPayerAndReceiverAndAmountAndDate(SplitGroup group,
                                                             SplitParticipant payer,
                                                             SplitParticipant receiver,
                                                             BigDecimal amount,
                                                             LocalDate date);

    // A participant who is part of a settlement record cannot simply be removed.
    long countByPayerOrReceiver(SplitParticipant payer, SplitParticipant receiver);
}
