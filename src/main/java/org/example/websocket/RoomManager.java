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

        if (room.getPlayers().size() >= 2 && !room.getPlayers().containsKey(username)) {
            throw new IllegalStateException("Room is full");
        }

        if (room.getState().equals("FINISHED")) {
            throw new IllegalStateException("Game has already finished");
        }

        // Add player
        RoomPlayer player = room.getPlayers().computeIfAbsent(username, u -> new RoomPlayer(u, avatarUrl));
        
        // If two players joined, kickstart countdown
        if (room.getPlayers().size() == 2 && room.getState().equals("WAITING")) {
            room.setState("COUNTDOWN");
            room.setStartTimestamp(System.currentTimeMillis() + 3000); // 3-second countdown
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
        }
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

        if (room.getWinnerUsername() == null) {
            room.setWinnerUsername(username);
            room.setState("FINISHED");
        }

        return room;
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

        // If a player left during gameplay, declare other player as winner
        if (room.getState().equals("PLAYING") || room.getState().equals("COUNTDOWN")) {
            room.setState("FINISHED");
            // Set the remaining player as winner
            for (String remainingUser : room.getPlayers().keySet()) {
                room.setWinnerUsername(remainingUser);
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
