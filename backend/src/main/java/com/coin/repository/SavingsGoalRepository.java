package com.coin.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.coin.entity.SavingsGoal;
import com.coin.entity.User;

public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {

    List<SavingsGoal> findByUserOrderByCreatedAtAsc(User user);

    Optional<SavingsGoal> findByIdAndUser(Long id, User user);

    /** Case-insensitive so "#Laptop" and "#laptop" can never become two goals. */
    Optional<SavingsGoal> findByUserAndNameIgnoreCase(User user, String name);

    long countByUser(User user);
}
