package org.example.controller;

import org.example.model.GameHistory;
import org.example.model.User;
import org.example.repository.GameHistoryRepository;
import org.example.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GameHistoryRepository gameHistoryRepository;

    /**
     * Get top users ranked by games won.
     */
    @GetMapping
    public ResponseEntity<List<User>> getGlobalLeaderboard() {
        List<User> topPlayers = userRepository.findTop20ByOrderByGamesWonDesc();
        return ResponseEntity.ok(topPlayers);
    }

    /**
     * Get top solve times for a specific difficulty level.
     */
    @GetMapping("/fastest")
    public ResponseEntity<List<GameHistory>> getFastestSolves(
            @RequestParam(defaultValue = "Medium") String difficulty,
            @RequestParam(defaultValue = "15") int limit) {
        
        List<GameHistory> topSolves = gameHistoryRepository.findTopScoresByDifficulty(
                difficulty,
                PageRequest.of(0, limit)
        );
        return ResponseEntity.ok(topSolves);
    }

    /**
     * Get top solve times specifically for today's Daily Challenge.
     */
    @GetMapping("/daily")
    public ResponseEntity<List<GameHistory>> getDailyLeaderboard(
            @RequestParam(defaultValue = "15") int limit) {
        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneOffset.UTC);
        java.time.LocalDateTime startOfToday = today.atStartOfDay();
        List<GameHistory> dailyLeaderboard = gameHistoryRepository.findDailyLeaderboard(
                startOfToday,
                PageRequest.of(0, limit)
        );
        return ResponseEntity.ok(dailyLeaderboard);
    }
}
