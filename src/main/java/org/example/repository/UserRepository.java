package org.example.repository;

import org.example.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);

    // Leaderboard: Top 20 users by games won or a calculated score
    List<User> findTop20ByOrderByGamesWonDesc();

    @Query("SELECT u FROM User u WHERE u.fastestSolveTimeSeconds IS NOT NULL ORDER BY u.fastestSolveTimeSeconds ASC")
    List<User> findTop20ByOrderByFastestSolveTimeSecondsAsc();

    List<User> findByUsernameContainingIgnoreCase(String username);
}
