package org.example.websocket;

import org.example.dto.SudokuPuzzleDto;
import org.example.model.GameHistory;
import org.example.model.User;
import org.example.repository.GameHistoryRepository;
import org.example.repository.UserRepository;
import org.example.service.SudokuService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Optional;

@Controller
public class RoomController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private RoomManager roomManager;

    @Autowired
    private SudokuService sudokuService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GameHistoryRepository gameHistoryRepository;

    /**
     * REST endpoint to initialize a room and generate its puzzle.
     */
    @PostMapping("/api/rooms/create")
    @ResponseBody
    public ResponseEntity<Room> createRoom(@RequestParam(defaultValue = "Medium") String difficulty) {
        SudokuPuzzleDto puzzle = sudokuService.generatePuzzle(difficulty);
        Room room = roomManager.createRoom(difficulty, puzzle.getBoard(), puzzle.getSolution());
        return ResponseEntity.ok(room);
    }

    /**
     * WebSocket: Player joins the lobby.
     */
    @MessageMapping("/room/join")
    public void joinRoom(JoinPayload payload) {
        try {
            Room room = roomManager.joinRoom(payload.getRoomCode(), payload.getUsername(), payload.getAvatarUrl());
            broadcastRoomState(room);
        } catch (Exception e) {
            // Send error message to player if needed (could log or send private message)
            System.err.println("Error joining room: " + e.getMessage());
        }
    }

    /**
     * WebSocket: Host triggers the match start countdown.
     */
    @MessageMapping("/room/start-countdown")
    public void startCountdown(StartCountdownPayload payload) {
        try {
            Room room = roomManager.startCountdown(payload.getRoomCode(), payload.getUsername());
            broadcastRoomState(room);
        } catch (Exception e) {
            System.err.println("Error starting countdown: " + e.getMessage());
        }
    }

    /**
     * WebSocket: Starts the game when the client countdown completes.
     */
    @MessageMapping("/room/start")
    public void startGame(StartPayload payload) {
        Room room = roomManager.getRoom(payload.getRoomCode());
        if (room != null && room.getState().equals("COUNTDOWN")) {
            room.setState("PLAYING");
            broadcastRoomState(room);
        }
    }

    /**
     * WebSocket: Real-time progress percentage update.
     */
    @MessageMapping("/room/progress")
    public void updateProgress(ProgressPayload payload) {
        Room room = roomManager.updateProgress(
                payload.getRoomCode(),
                payload.getUsername(),
                payload.getCompletedCells(),
                payload.getMistakes(),
                payload.getCurrentBoard()
        );
        if (room != null) {
            broadcastRoomState(room);
        }
    }

    /**
     * WebSocket: A player completes their board.
     */
    @MessageMapping("/room/finish")
    public void finishGame(FinishPayload payload) {
        Room room = roomManager.finishGame(
                payload.getRoomCode(),
                payload.getUsername(),
                payload.getSolveTimeSeconds(),
                payload.getMistakes()
        );
        if (room != null) {
            // Save results to DB
            persistRoomStats(room);
            broadcastRoomState(room);
        }
    }

    /**
     * WebSocket: A player disconnected or clicked "Leave Room".
     */
    @MessageMapping("/room/leave")
    public void leaveRoom(LeavePayload payload) {
        Room room = roomManager.removePlayer(payload.getRoomCode(), payload.getUsername());
        if (room != null) {
            broadcastRoomState(room);
        } else {
            // Room is deleted, broadcast nothing or empty state
        }
    }

    @org.springframework.web.bind.annotation.GetMapping("/api/rooms/active")
    @ResponseBody
    public ResponseEntity<java.util.Collection<Room>> getActiveRooms() {
        return ResponseEntity.ok(roomManager.getActiveRooms());
    }

    @MessageMapping("/room/spectate/join")
    public void joinSpectator(SpectatePayload payload) {
        Room room = roomManager.addSpectator(payload.getRoomCode(), payload.getUsername());
        broadcastRoomState(room);
    }

    @MessageMapping("/room/spectate/leave")
    public void leaveSpectator(SpectatePayload payload) {
        Room room = roomManager.removeSpectator(payload.getRoomCode(), payload.getUsername());
        if (room != null) {
            broadcastRoomState(room);
        }
    }

    @MessageMapping("/friends/challenge")
    public void challengeFriend(ChallengePayload payload) {
        messagingTemplate.convertAndSend(
            "/topic/user/" + payload.getRecipientUsername() + "/notifications",
            payload
        );
    }

    private void broadcastRoomState(Room room) {
        if (room != null) {
            messagingTemplate.convertAndSend("/topic/room/" + room.getRoomCode().toUpperCase(), room);
        }
    }

    /**
     * Helper to write final stats to the PostgreSQL/H2 DB once the multiplayer game finishes.
     */
    private void persistRoomStats(Room room) {
        String winner = room.getWinnerUsername();
        String difficulty = room.getDifficulty();

        for (RoomPlayer rp : room.getPlayers().values()) {
            Optional<User> userOpt = userRepository.findByUsername(rp.getUsername());
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                boolean isWinner = rp.getUsername().equals(winner);

                // Update aggregate stats
                user.setGamesPlayed(user.getGamesPlayed() + 1);
                if (isWinner) {
                    user.setGamesWon(user.getGamesWon() + 1);
                }

                if (isWinner || rp.isFinished()) {
                    int time = rp.getSolveTimeSeconds();
                    user.setTotalSolveTimeSeconds(user.getTotalSolveTimeSeconds() + time);

                    if (isWinner) {
                        if (user.getFastestSolveTimeSeconds() == null || time < user.getFastestSolveTimeSeconds()) {
                            user.setFastestSolveTimeSeconds(time);
                        }
                    }

                    switch (difficulty.toLowerCase()) {
                        case "easy" -> user.setEasyPuzzlesSolved(user.getEasyPuzzlesSolved() + 1);
                        case "medium" -> user.setMediumPuzzlesSolved(user.getMediumPuzzlesSolved() + 1);
                        case "hard" -> user.setHardPuzzlesSolved(user.getHardPuzzlesSolved() + 1);
                        case "expert" -> user.setExpertPuzzlesSolved(user.getExpertPuzzlesSolved() + 1);
                    }
                }

                userRepository.save(user);

                // Calculate a simple score: Base 1000 for win, + remaining time bonus or - mistake penalties
                int score = 0;
                if (isWinner) {
                    score += 1000;
                    // Speed bonus
                    score += Math.max(0, 1200 - rp.getSolveTimeSeconds());
                } else {
                    score += rp.getCompletedCells() * 5;
                }
                score = Math.max(0, score - (rp.getMistakes() * 100));

                // Save game history record
                GameHistory history = new GameHistory(
                        user,
                        difficulty,
                        rp.getSolveTimeSeconds(),
                        rp.getMistakes(),
                        0, // Hints not tracked in multiplayer for simplicity
                        score,
                        isWinner
                );
                gameHistoryRepository.save(history);
            }
        }
    }

    // --- Inner Payload DTO Classes ---

    public static class JoinPayload {
        private String roomCode;
        private String username;
        private String avatarUrl;

        public String getRoomCode() { return roomCode; }
        public void setRoomCode(String roomCode) { this.roomCode = roomCode; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    }

    public static class StartPayload {
        private String roomCode;
        public String getRoomCode() { return roomCode; }
        public void setRoomCode(String roomCode) { this.roomCode = roomCode; }
    }

    public static class ProgressPayload {
        private String roomCode;
        private String username;
        private int completedCells;
        private int mistakes;
        private int[][] currentBoard;

        public String getRoomCode() { return roomCode; }
        public void setRoomCode(String roomCode) { this.roomCode = roomCode; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public int getCompletedCells() { return completedCells; }
        public void setCompletedCells(int completedCells) { this.completedCells = completedCells; }
        public int getMistakes() { return mistakes; }
        public void setMistakes(int mistakes) { this.mistakes = mistakes; }
        public int[][] getCurrentBoard() { return currentBoard; }
        public void setCurrentBoard(int[][] currentBoard) { this.currentBoard = currentBoard; }
    }

    public static class FinishPayload {
        private String roomCode;
        private String username;
        private int solveTimeSeconds;
        private int mistakes;

        public String getRoomCode() { return roomCode; }
        public void setRoomCode(String roomCode) { this.roomCode = roomCode; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public int getSolveTimeSeconds() { return solveTimeSeconds; }
        public void setSolveTimeSeconds(int solveTimeSeconds) { this.solveTimeSeconds = solveTimeSeconds; }
        public int getMistakes() { return mistakes; }
        public void setMistakes(int mistakes) { this.mistakes = mistakes; }
    }

    public static class LeavePayload {
        private String roomCode;
        private String username;

        public String getRoomCode() { return roomCode; }
        public void setRoomCode(String roomCode) { this.roomCode = roomCode; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
    }

    public static class StartCountdownPayload {
        private String roomCode;
        private String username;

        public String getRoomCode() { return roomCode; }
        public void setRoomCode(String roomCode) { this.roomCode = roomCode; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
    }

    public static class SpectatePayload {
        private String roomCode;
        private String username;

        public String getRoomCode() { return roomCode; }
        public void setRoomCode(String roomCode) { this.roomCode = roomCode; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
    }

    public static class ChallengePayload {
        private String senderUsername;
        private String recipientUsername;
        private String roomCode;
        private String difficulty;

        public String getSenderUsername() { return senderUsername; }
        public void setSenderUsername(String senderUsername) { this.senderUsername = senderUsername; }
        public String getRecipientUsername() { return recipientUsername; }
        public void setRecipientUsername(String recipientUsername) { this.recipientUsername = recipientUsername; }
        public String getRoomCode() { return roomCode; }
        public void setRoomCode(String roomCode) { this.roomCode = roomCode; }
        public String getDifficulty() { return difficulty; }
        public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
    }
}
