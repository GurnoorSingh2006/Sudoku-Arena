package org.example.controller;

import org.example.dto.SudokuPuzzleDto;
import org.example.model.User;
import org.example.repository.GameHistoryRepository;
import org.example.service.SudokuService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sudoku")
public class SudokuController {

    @Autowired
    private SudokuService sudokuService;

    @Autowired
    private GameHistoryRepository gameHistoryRepository;

    @GetMapping("/generate")
    public ResponseEntity<SudokuPuzzleDto> generatePuzzle(@RequestParam(defaultValue = "Medium") String difficulty) {
        SudokuPuzzleDto puzzle = sudokuService.generatePuzzle(difficulty);
        return ResponseEntity.ok(puzzle);
    }

    @GetMapping("/daily")
    public ResponseEntity<DailyChallengeResponse> getDailyChallenge(@AuthenticationPrincipal User user) {
        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneOffset.UTC);
        long seed = today.getYear() * 10000L + today.getMonthValue() * 100L + today.getDayOfMonth();

        // Seed-based randomized difficulty
        java.util.Random difficultyRnd = new java.util.Random(seed);
        String[] difficulties = {"Easy", "Medium", "Hard", "Expert"};
        String dailyDifficulty = difficulties[difficultyRnd.nextInt(difficulties.length)];

        SudokuPuzzleDto puzzle = sudokuService.generatePuzzleWithSeed(dailyDifficulty, seed);

        boolean completed = false;
        if (user != null) {
            java.time.LocalDateTime startOfDay = today.atStartOfDay();
            completed = gameHistoryRepository.existsByUserAndDifficultyAndCompletedAtGreaterThanEqual(
                    user, "Daily", startOfDay
            );
        }

        DailyChallengeResponse response = new DailyChallengeResponse(
                puzzle.getBoard(),
                puzzle.getSolution(),
                dailyDifficulty,
                completed,
                today.toString()
        );

        return ResponseEntity.ok(response);
    }

    public static class DailyChallengeResponse {
        private int[][] board;
        private int[][] solution;
        private String difficulty;
        private boolean completed;
        private String date;

        public DailyChallengeResponse(int[][] board, int[][] solution, String difficulty, boolean completed, String date) {
            this.board = board;
            this.solution = solution;
            this.difficulty = difficulty;
            this.completed = completed;
            this.date = date;
        }

        public int[][] getBoard() { return board; }
        public void setBoard(int[][] board) { this.board = board; }
        public int[][] getSolution() { return solution; }
        public void setSolution(int[][] solution) { this.solution = solution; }
        public String getDifficulty() { return difficulty; }
        public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
        public boolean isCompleted() { return completed; }
        public void setCompleted(boolean completed) { this.completed = completed; }
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
    }
}
