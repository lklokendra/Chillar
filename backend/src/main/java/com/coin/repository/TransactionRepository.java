package com.coin.repository;

import com.coin.entity.Category;
import com.coin.entity.Transaction;
import com.coin.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserAndCategoryOrderByDateDescCreatedAtDesc(User user, Category category);
    List<Transaction> findByUserOrderByDateDescCreatedAtDesc(User user);
    
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user = :user AND t.category = :category")
    BigDecimal sumAmountByUserAndCategory(@Param("user") User user, @Param("category") Category category);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user = :user")
    BigDecimal sumAmountByUser(@Param("user") User user);
}
