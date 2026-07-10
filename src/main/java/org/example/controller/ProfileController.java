package org.example.controller;

import org.example.model.GameHistory;
import org.example.model.User;
import org.example.repository.GameHistoryRepository;
import org.example.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GameHistoryRepository gameHistoryRepository;

    @GetMapping
    public ResponseEntity<User> getProfile(@AuthenticationPrincipal User user) {
        // Reload user from database to ensure fresh stats
        Optional<User> freshUser = userRepository.findById(user.getId());
        return freshUser.map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping
    public ResponseEntity<?> updateProfile(@AuthenticationPrincipal User user, @RequestBody UpdateProfileRequest request) {
        Optional<User> dbUserOpt = userRepository.findById(user.getId());
        if (dbUserOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User dbUser = dbUserOpt.get();

        if (request.getUsername() != null && !request.getUsername().trim().isEmpty()) {
            String newUsername = request.getUsername().trim();
            if (!newUsername.equals(dbUser.getUsername()) && userRepository.existsByUsername(newUsername)) {
                return ResponseEntity.badRequest().body("Username already taken");
            }
            dbUser.setUsername(newUsername);
        }

        if (request.getAvatarUrl() != null) {
            dbUser.setAvatarUrl(request.getAvatarUrl());
        }

        userRepository.save(dbUser);
        return ResponseEntity.ok(dbUser);
    }

    @GetMapping("/history")
    public ResponseEntity<List<GameHistory>> getHistory(@AuthenticationPrincipal User user, @RequestParam(defaultValue = "10") int limit) {
        List<GameHistory> history = gameHistoryRepository.findByUserOrderByCompletedAtDesc(user, PageRequest.of(0, limit));
        return ResponseEntity.ok(history);
    }

    /**
     * Endpoint to record finished single-player games.
     */
    @PostMapping("/games")
    public ResponseEntity<?> recordGame(@AuthenticationPrincipal User user, @RequestBody GameRecordRequest request) {
        Optional<User> dbUserOpt = userRepository.findById(user.getId());
        if (dbUserOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        User dbUser = dbUserOpt.get();

        dbUser.setGamesPlayed(dbUser.getGamesPlayed() + 1);
        if (request.isWin()) {
            dbUser.setGamesWon(dbUser.getGamesWon() + 1);

            int time = request.getSolveTimeSeconds();
            dbUser.setTotalSolveTimeSeconds(dbUser.getTotalSolveTimeSeconds() + time);

            if (dbUser.getFastestSolveTimeSeconds() == null || time < dbUser.getFastestSolveTimeSeconds()) {
                dbUser.setFastestSolveTimeSeconds(time);
            }

            switch (request.getDifficulty().toLowerCase()) {
                case "easy" -> dbUser.setEasyPuzzlesSolved(dbUser.getEasyPuzzlesSolved() + 1);
                case "medium" -> dbUser.setMediumPuzzlesSolved(dbUser.getMediumPuzzlesSolved() + 1);
                case "hard" -> dbUser.setHardPuzzlesSolved(dbUser.getHardPuzzlesSolved() + 1);
                case "expert" -> dbUser.setExpertPuzzlesSolved(dbUser.getExpertPuzzlesSolved() + 1);
                case "daily" -> dbUser.setDailyChallengesSolved(dbUser.getDailyChallengesSolved() + 1);
            }
        }

        userRepository.save(dbUser);

        GameHistory history = new GameHistory(
                dbUser,
                request.getDifficulty(),
                request.getSolveTimeSeconds(),
                request.getMistakes(),
                request.getHintsUsed(),
                request.getScore(),
                request.isWin()
        );

        gameHistoryRepository.save(history);
        return ResponseEntity.ok(dbUser);
    }

    @GetMapping("/stats")
    public ResponseEntity<?> getStats(@AuthenticationPrincipal User user) {
        Optional<User> dbUserOpt = userRepository.findById(user.getId());
        if (dbUserOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User dbUser = dbUserOpt.get();

        Integer bestEasy = gameHistoryRepository.findBestTimeByUserAndDifficulty(dbUser, "easy");
        Integer bestMedium = gameHistoryRepository.findBestTimeByUserAndDifficulty(dbUser, "medium");
        Integer bestHard = gameHistoryRepository.findBestTimeByUserAndDifficulty(dbUser, "hard");
        Integer bestExpert = gameHistoryRepository.findBestTimeByUserAndDifficulty(dbUser, "expert");
        Integer bestDaily = gameHistoryRepository.findBestTimeByUserAndDifficulty(dbUser, "daily");

        java.util.Map<String, Object> stats = new java.util.HashMap<>();
        stats.put("gamesPlayed", dbUser.getGamesPlayed());
        stats.put("gamesWon", dbUser.getGamesWon());
        stats.put("totalSolveTimeSeconds", dbUser.getTotalSolveTimeSeconds());
        stats.put("fastestSolveTimeSeconds", dbUser.getFastestSolveTimeSeconds());
        stats.put("easyPuzzlesSolved", dbUser.getEasyPuzzlesSolved());
        stats.put("mediumPuzzlesSolved", dbUser.getMediumPuzzlesSolved());
        stats.put("hardPuzzlesSolved", dbUser.getHardPuzzlesSolved());
        stats.put("expertPuzzlesSolved", dbUser.getExpertPuzzlesSolved());
        stats.put("dailyChallengesSolved", dbUser.getDailyChallengesSolved());
        
        stats.put("bestTimeEasy", bestEasy);
        stats.put("bestTimeMedium", bestMedium);
        stats.put("bestTimeHard", bestHard);
        stats.put("bestTimeExpert", bestExpert);
        stats.put("bestTimeDaily", bestDaily);

        return ResponseEntity.ok(stats);
    }

    // --- Inner Requests ---

    public static class UpdateProfileRequest {
        private String username;
        private String avatarUrl;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    }

    public static class GameRecordRequest {
        private String difficulty;
        private int solveTimeSeconds;
        private int mistakes;
        private int hintsUsed;
        private int score;
        private boolean win;

        public String getDifficulty() { return difficulty; }
        public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
        public int getSolveTimeSeconds() { return solveTimeSeconds; }
        public void setSolveTimeSeconds(int solveTimeSeconds) { this.solveTimeSeconds = solveTimeSeconds; }
        public int getMistakes() { return mistakes; }
        public void setMistakes(int mistakes) { this.mistakes = mistakes; }
        public int getHintsUsed() { return hintsUsed; }
        public void setHintsUsed(int hintsUsed) { this.hintsUsed = hintsUsed; }
        public int getScore() { return score; }
        public void setScore(int score) { this.score = score; }
        public boolean isWin() { return win; }
        public void setWin(boolean win) { this.win = win; }
    }
}
