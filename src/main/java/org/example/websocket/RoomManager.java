package org.example.websocket;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomManager {
    private final Map<String, Room> activeRooms = new ConcurrentHashMap<>();
    private final Random random = new Random();

    public Room createRoom(String difficulty, int[][] board, int[][] solution) {
        String code;
        do {
            code = generateRoomCode();
        } while (activeRooms.containsKey(code));

        Room room = new Room(code, difficulty, board, solution);
        activeRooms.put(code, room);
        return room;
    }

    public Room getRoom(String roomCode) {
        if (roomCode == null) return null;
        return activeRooms.get(roomCode.toUpperCase());
    }

    public Room joinRoom(String roomCode, String username, String avatarUrl) {
        Room room = getRoom(roomCode);
        if (room == null) {
            throw new IllegalArgumentException("Room not found");
        }

        if (room.getPlayers().size() >= 10 && !room.getPlayers().containsKey(username)) {
            throw new IllegalStateException("Room is full");
        }

        if (room.getState().equals("FINISHED")) {
            throw new IllegalStateException("Game has already finished");
        }

        // Add player
        RoomPlayer player = room.getPlayers().computeIfAbsent(username, u -> new RoomPlayer(u, avatarUrl));
        
        // First player to join becomes the host
        if (room.getHostUsername() == null) {
            room.setHostUsername(username);
        }

        return room;
    }

    public Room startCountdown(String roomCode, String hostUsername) {
        Room room = getRoom(roomCode);
        if (room == null) return null;
        if (room.getHostUsername() == null || !room.getHostUsername().equals(hostUsername)) {
            throw new IllegalArgumentException("Only the host can start the game");
        }
        if (room.getState().equals("WAITING")) {
            room.setState("COUNTDOWN");
            room.setStartTimestamp(System.currentTimeMillis() + 5000); // 5-second countdown
        }
        return room;
    }

    public Room updateProgress(String roomCode, String username, int completedCells, int mistakes) {
        Room room = getRoom(roomCode);
        if (room == null) return null;

        RoomPlayer player = room.getPlayers().get(username);
        if (player != null) {
            player.setCompletedCells(completedCells);
            player.setMistakes(mistakes);
            int percentage = (int) ((completedCells / 81.0) * 100);
            player.setCompletionPercentage(Math.min(percentage, 100));

            // Mark player as finished (failed) if they reach 3 mistakes
            if (mistakes >= 3) {
                player.setFinished(true);
            }
        }

        checkAllPlayersFinished(room);
        return room;
    }

    public Room finishGame(String roomCode, String username, int solveTimeSeconds, int mistakes) {
        Room room = getRoom(roomCode);
        if (room == null) return null;

        RoomPlayer player = room.getPlayers().get(username);
        if (player != null) {
            player.setFinished(true);
            player.setSolveTimeSeconds(solveTimeSeconds);
            player.setMistakes(mistakes);
            player.setCompletionPercentage(100);
            player.setCompletedCells(81);
        }

        // If player solved it successfully (mistakes < 3) and no winner yet, set them as winner
        if (room.getWinnerUsername() == null && mistakes < 3) {
            room.setWinnerUsername(username);
            room.setState("FINISHED");
        }

        checkAllPlayersFinished(room);
        return room;
    }

    private void checkAllPlayersFinished(Room room) {
        boolean allDone = true;
        for (RoomPlayer rp : room.getPlayers().values()) {
            if (!rp.isFinished() && rp.getMistakes() < 3) {
                allDone = false;
                break;
            }
        }

        if (allDone && room.getState().equals("PLAYING")) {
            room.setState("FINISHED");
            
            // If the game ended but no winner was declared (e.g., everyone failed),
            // declare the person with the most completed cells (and least mistakes as tie-breaker) who didn't fail
            if (room.getWinnerUsername() == null) {
                String bestWinner = null;
                int maxCompleted = -1;
                int minMistakes = 999;
                for (RoomPlayer rp : room.getPlayers().values()) {
                    if (rp.getMistakes() < 3) {
                        if (rp.getCompletedCells() > maxCompleted) {
                            maxCompleted = rp.getCompletedCells();
                            bestWinner = rp.getUsername();
                            minMistakes = rp.getMistakes();
                        } else if (rp.getCompletedCells() == maxCompleted && rp.getMistakes() < minMistakes) {
                            bestWinner = rp.getUsername();
                            minMistakes = rp.getMistakes();
                        }
                    }
                }
                room.setWinnerUsername(bestWinner);
            }
        }
    }

    public Room removePlayer(String roomCode, String username) {
        Room room = getRoom(roomCode);
        if (room == null) return null;

        room.getPlayers().remove(username);

        // If the room is empty, delete it
        if (room.getPlayers().isEmpty()) {
            activeRooms.remove(roomCode.toUpperCase());
            return null;
        }

        // If the host left, assign a new host
        if (room.getHostUsername() != null && room.getHostUsername().equals(username)) {
            String newHost = room.getPlayers().keySet().iterator().next();
            room.setHostUsername(newHost);
        }

        // If players left during gameplay, check if we need to end the match
        if (room.getState().equals("PLAYING") || room.getState().equals("COUNTDOWN")) {
            int activeCount = 0;
            String lastActiveUser = null;
            for (RoomPlayer rp : room.getPlayers().values()) {
                if (!rp.isFinished() && rp.getMistakes() < 3) {
                    activeCount++;
                    lastActiveUser = rp.getUsername();
                }
            }

            if (activeCount == 0) {
                room.setState("FINISHED");
            } else if (room.getPlayers().size() == 1) {
                // If only 1 player remains, finish match and make them winner
                room.setState("FINISHED");
                if (room.getWinnerUsername() == null) {
                    room.setWinnerUsername(lastActiveUser);
                }
            }
        }

        return room;
    }

    private String generateRoomCode() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 6; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
