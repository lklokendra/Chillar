package com.coin.repository;

import com.coin.entity.Category;
import com.coin.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    List<Category> findByUserOrderByCreatedAtAsc(User user);
    Optional<Category> findByUserAndNameIgnoreCase(User user, String name);
}
