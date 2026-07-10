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

    boolean existsByUserAndDifficultyAndCompletedAtGreaterThanEqual(User user, String difficulty, java.time.LocalDateTime completedAt);

    @Query("SELECT gh FROM GameHistory gh WHERE gh.difficulty = 'Daily' AND gh.win = true AND gh.completedAt >= :startOfToday ORDER BY gh.solveTimeSeconds ASC")
    List<GameHistory> findDailyLeaderboard(java.time.LocalDateTime startOfToday, org.springframework.data.domain.Pageable pageable);

    @Query("SELECT MIN(gh.solveTimeSeconds) FROM GameHistory gh WHERE gh.user = :user AND LOWER(gh.difficulty) = LOWER(:difficulty) AND gh.win = true")
    Integer findBestTimeByUserAndDifficulty(User user, String difficulty);
}
