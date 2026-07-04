package org.example.repository;

import org.example.model.GameHistory;
import org.example.model.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GameHistoryRepository extends JpaRepository<GameHistory, Long> {
    List<GameHistory> findByUserOrderByCompletedAtDesc(User user);
    List<GameHistory> findByUserOrderByCompletedAtDesc(User user, Pageable pageable);

    // Fetch the fastest solve times globally for a given difficulty
    @Query("SELECT gh FROM GameHistory gh WHERE gh.difficulty = :difficulty AND gh.win = true ORDER BY gh.solveTimeSeconds ASC")
    List<GameHistory> findTopScoresByDifficulty(String difficulty, Pageable pageable);
}
