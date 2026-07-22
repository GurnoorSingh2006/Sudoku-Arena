package org.example.websocket;

public class RoomPlayer {
    private String username;
    private String avatarUrl;
    private int completionPercentage = 0;
    private int completedCells = 0;
    private int mistakes = 0;
    private boolean finished = false;
    private int solveTimeSeconds = 0;
    private int[][] currentBoard;

    public RoomPlayer() {}

    public RoomPlayer(String username, String avatarUrl) {
        this.username = username;
        this.avatarUrl = avatarUrl;
    }

    // Getters and Setters
    public int[][] getCurrentBoard() { return currentBoard; }
    public void setCurrentBoard(int[][] currentBoard) { this.currentBoard = currentBoard; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public int getCompletionPercentage() { return completionPercentage; }
    public void setCompletionPercentage(int completionPercentage) { this.completionPercentage = completionPercentage; }

    public int getCompletedCells() { return completedCells; }
    public void setCompletedCells(int completedCells) { this.completedCells = completedCells; }

    public int getMistakes() { return mistakes; }
    public void setMistakes(int mistakes) { this.mistakes = mistakes; }

    public boolean isFinished() { return finished; }
    public void setFinished(boolean finished) { this.finished = finished; }

    public int getSolveTimeSeconds() { return solveTimeSeconds; }
    public void setSolveTimeSeconds(int solveTimeSeconds) { this.solveTimeSeconds = solveTimeSeconds; }
}
