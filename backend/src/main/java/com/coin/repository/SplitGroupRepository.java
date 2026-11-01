package com.coin.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.coin.entity.SplitGroup;
import com.coin.entity.User;

public interface SplitGroupRepository extends JpaRepository<SplitGroup, Long> {

    List<SplitGroup> findByUserOrderByCreatedAtDesc(User user);

    Optional<SplitGroup> findByIdAndUser(Long id, User user);
}
