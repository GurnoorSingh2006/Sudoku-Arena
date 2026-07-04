package org.example.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "game_history")
public class GameHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String difficulty; // "Easy", "Medium", "Hard", "Expert"

    @Column(nullable = false)
    private int solveTimeSeconds;

    @Column(nullable = false)
    private int mistakes;

    @Column(nullable = false)
    private int hintsUsed;

    @Column(nullable = false)
    private int score;

    @Column(nullable = false)
    private boolean win;

    private LocalDateTime completedAt = LocalDateTime.now();

    // Constructors
    public GameHistory() {}

    public GameHistory(User user, String difficulty, int solveTimeSeconds, int mistakes, int hintsUsed, int score, boolean win) {
        this.user = user;
        this.difficulty = difficulty;
        this.solveTimeSeconds = solveTimeSeconds;
        this.mistakes = mistakes;
        this.hintsUsed = hintsUsed;
        this.score = score;
        this.win = win;
        this.completedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

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

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
