package org.example.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private String password;

    private String avatarUrl;

    private LocalDateTime createdAt = LocalDateTime.now();

    // Statistics embedded directly for fast queries
    private int gamesPlayed = 0;
    private int gamesWon = 0;
    private Integer fastestSolveTimeSeconds = null; // null represents no puzzles solved yet
    private long totalSolveTimeSeconds = 0; // to compute average solve time
    private int easyPuzzlesSolved = 0;
    private int mediumPuzzlesSolved = 0;
    private int hardPuzzlesSolved = 0;
    private int expertPuzzlesSolved = 0;
    private int dailyChallengesSolved = 0;

    // Constructors
    public User() {}

    public User(String username, String email, String password, String avatarUrl) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.avatarUrl = avatarUrl;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public int getGamesPlayed() { return gamesPlayed; }
    public void setGamesPlayed(int gamesPlayed) { this.gamesPlayed = gamesPlayed; }

    public int getGamesWon() { return gamesWon; }
    public void setGamesWon(int gamesWon) { this.gamesWon = gamesWon; }

    public Integer getFastestSolveTimeSeconds() { return fastestSolveTimeSeconds; }
    public void setFastestSolveTimeSeconds(Integer fastestSolveTimeSeconds) { this.fastestSolveTimeSeconds = fastestSolveTimeSeconds; }

    public long getTotalSolveTimeSeconds() { return totalSolveTimeSeconds; }
    public void setTotalSolveTimeSeconds(long totalSolveTimeSeconds) { this.totalSolveTimeSeconds = totalSolveTimeSeconds; }

    public int getEasyPuzzlesSolved() { return easyPuzzlesSolved; }
    public void setEasyPuzzlesSolved(int easyPuzzlesSolved) { this.easyPuzzlesSolved = easyPuzzlesSolved; }

    public int getMediumPuzzlesSolved() { return mediumPuzzlesSolved; }
    public void setMediumPuzzlesSolved(int mediumPuzzlesSolved) { this.mediumPuzzlesSolved = mediumPuzzlesSolved; }

    public int getHardPuzzlesSolved() { return hardPuzzlesSolved; }
    public void setHardPuzzlesSolved(int hardPuzzlesSolved) { this.hardPuzzlesSolved = hardPuzzlesSolved; }

    public int getExpertPuzzlesSolved() { return expertPuzzlesSolved; }
    public void setExpertPuzzlesSolved(int expertPuzzlesSolved) { this.expertPuzzlesSolved = expertPuzzlesSolved; }

    public int getDailyChallengesSolved() { return dailyChallengesSolved; }
    public void setDailyChallengesSolved(int dailyChallengesSolved) { this.dailyChallengesSolved = dailyChallengesSolved; }
}
