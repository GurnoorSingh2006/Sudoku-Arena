package org.example.websocket;

import java.util.HashMap;
import java.util.Map;

public class Room {
    private String roomCode;
    private String difficulty;
    private int[][] board;
    private int[][] solution;
    private String state = "WAITING"; // "WAITING", "COUNTDOWN", "PLAYING", "FINISHED"
    private Map<String, RoomPlayer> players = new HashMap<>(); // key: username
    private String winnerUsername = null;
    private long startTimestamp = 0;
    private String hostUsername;
    private java.util.Set<String> spectators = new java.util.HashSet<>();

    public Room() {}

    public Room(String roomCode, String difficulty, int[][] board, int[][] solution) {
        this.roomCode = roomCode;
        this.difficulty = difficulty;
        this.board = board;
        this.solution = solution;
    }

    // Getters and Setters
    public String getRoomCode() { return roomCode; }
    public void setRoomCode(String roomCode) { this.roomCode = roomCode; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public int[][] getBoard() { return board; }
    public void setBoard(int[][] board) { this.board = board; }

    public int[][] getSolution() { return solution; }
    public void setSolution(int[][] solution) { this.solution = solution; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public Map<String, RoomPlayer> getPlayers() { return players; }
    public void setPlayers(Map<String, RoomPlayer> players) { this.players = players; }

    public String getWinnerUsername() { return winnerUsername; }
    public void setWinnerUsername(String winnerUsername) { this.winnerUsername = winnerUsername; }

    public long getStartTimestamp() { return startTimestamp; }
    public void setStartTimestamp(long startTimestamp) { this.startTimestamp = startTimestamp; }

    public String getHostUsername() { return hostUsername; }
    public void setHostUsername(String hostUsername) { this.hostUsername = hostUsername; }

    public java.util.Set<String> getSpectators() { return spectators; }
    public void setSpectators(java.util.Set<String> spectators) { this.spectators = spectators; }
}
