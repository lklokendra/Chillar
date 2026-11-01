package com.coin.repository;

import com.coin.entity.SavingsTransaction;
import com.coin.entity.SavingsType;
import com.coin.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface SavingsTransactionRepository extends JpaRepository<SavingsTransaction, Long> {

    List<SavingsTransaction> findByUserOrderByDateDescCreatedAtDesc(User user);

    Optional<SavingsTransaction> findByIdAndUser(Long id, User user);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM SavingsTransaction t WHERE t.user = :user AND t.type = :type")
    BigDecimal sumAmountByUserAndType(@Param("user") User user, @Param("type") SavingsType type);

    long countByUser(User user);
}
