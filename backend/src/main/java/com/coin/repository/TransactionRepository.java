package com.coin.repository;

import com.coin.entity.Category;
import com.coin.entity.Transaction;
import com.coin.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    // The category is fetched eagerly here because the serialisation happens
    // outside the persistence context (open-in-view is disabled).
    @Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.category "
            + "WHERE t.user = :user ORDER BY t.date DESC, t.createdAt DESC")
    List<Transaction> findByUserOrderByDateDescCreatedAtDesc(@Param("user") User user);

    @Query("SELECT t FROM Transaction t LEFT JOIN FETCH t.category "
            + "WHERE t.user = :user AND t.category = :category ORDER BY t.date DESC, t.createdAt DESC")
    List<Transaction> findByUserAndCategoryOrderByDateDescCreatedAtDesc(@Param("user") User user,
                                                                       @Param("category") Category category);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user = :user AND t.category = :category")
    BigDecimal sumAmountByUserAndCategory(@Param("user") User user, @Param("category") Category category);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.user = :user")
    BigDecimal sumAmountByUser(@Param("user") User user);

    Optional<Transaction> findByIdAndUser(Long id, User user);
}
