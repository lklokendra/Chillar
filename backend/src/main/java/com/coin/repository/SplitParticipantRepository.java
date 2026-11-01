package com.coin.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.coin.entity.SplitGroup;
import com.coin.entity.SplitParticipant;

public interface SplitParticipantRepository extends JpaRepository<SplitParticipant, Long> {

    List<SplitParticipant> findByGroupOrderByCreatedAtAsc(SplitGroup group);

    Optional<SplitParticipant> findByIdAndGroup(Long id, SplitGroup group);

    boolean existsByGroupAndNameIgnoreCase(SplitGroup group, String name);

    long countByGroup(SplitGroup group);
}
