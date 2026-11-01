package com.coin.repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.coin.entity.SavingsGoal;
import com.coin.entity.SavingsTransaction;
import com.coin.entity.SavingsType;
import com.coin.entity.User;

public interface SavingsTransactionRepository extends JpaRepository<SavingsTransaction, Long> {

    /**
     * Left-joins the goal so a row can be rendered outside a session (the app
     * runs with {@code open-in-view: false}).
     */
    @Query("SELECT t FROM SavingsTransaction t LEFT JOIN FETCH t.goal WHERE t.user = :user "
            + "ORDER BY t.date DESC, t.createdAt DESC")
    List<SavingsTransaction> findAllWithGoal(@Param("user") User user);

    @Query("SELECT t FROM SavingsTransaction t LEFT JOIN FETCH t.goal WHERE t.user = :user AND t.goal = :goal "
            + "ORDER BY t.date DESC, t.createdAt DESC")
    List<SavingsTransaction> findAllWithGoalByGoal(@Param("user") User user, @Param("goal") SavingsGoal goal);

    @Query("SELECT t FROM SavingsTransaction t LEFT JOIN FETCH t.goal WHERE t.user = :user "
            + "ORDER BY t.date DESC, t.createdAt DESC")
    List<SavingsTransaction> findRecent(@Param("user") User user, Pageable pageable);

    @Query("SELECT t FROM SavingsTransaction t WHERE t.user = :user AND t.goal = :goal")
    List<SavingsTransaction> findAllByUserAndGoal(@Param("user") User user, @Param("goal") SavingsGoal goal);

    Optional<SavingsTransaction> findByIdAndUser(Long id, User user);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM SavingsTransaction t WHERE t.user = :user AND t.type = :type")
    BigDecimal sumAmountByUserAndType(@Param("user") User user, @Param("type") SavingsType type);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM SavingsTransaction t "
            + "WHERE t.user = :user AND t.goal = :goal AND t.type = :type")
    BigDecimal sumAmountByUserAndGoalAndType(@Param("user") User user,
                                             @Param("goal") SavingsGoal goal,
                                             @Param("type") SavingsType type);

    /** Everything that no goal claims: the general savings pot. */
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM SavingsTransaction t "
            + "WHERE t.user = :user AND t.goal IS NULL AND t.type = :type")
    BigDecimal sumAmountByUserAndNoGoalAndType(@Param("user") User user, @Param("type") SavingsType type);

    long countByUser(User user);

    long countByUserAndGoal(User user, SavingsGoal goal);

    /** Rows that belong to one split withdrawal. */
    @Query("SELECT t FROM SavingsTransaction t WHERE t.user = :user AND t.groupId = :groupId")
    List<SavingsTransaction> findAllByUserAndGroupId(@Param("user") User user, @Param("groupId") String groupId);

    /** Ordinary single-category entries — one ledger row each. */
    long countByUserAndGroupIdIsNull(User user);

    /** Distinct split withdrawals, counted once no matter how many rows they hold. */
    @Query("SELECT COUNT(DISTINCT t.groupId) FROM SavingsTransaction t "
            + "WHERE t.user = :user AND t.groupId IS NOT NULL")
    long countGroupsByUser(@Param("user") User user);

    /** Every gullak row inside an inclusive date range, oldest first. */
    @Query("SELECT s FROM SavingsTransaction s WHERE s.user = :user AND s.date BETWEEN :from AND :to ORDER BY s.date ASC")
    List<SavingsTransaction> findByUserAndDateRange(@Param("user") User user,
                                                    @Param("from") LocalDate from,
                                                    @Param("to") LocalDate to);
}
