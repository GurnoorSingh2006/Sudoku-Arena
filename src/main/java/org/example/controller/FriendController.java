package org.example.controller;

import org.example.model.Friendship;
import org.example.model.User;
import org.example.repository.FriendshipRepository;
import org.example.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FriendshipRepository friendshipRepository;

    public static class FriendDto {
        public Long id;
        public String username;
        public String avatarUrl;
        public boolean online;
        public int gamesPlayed;
        public int gamesWon;
        public Integer fastestSolveTimeSeconds;

        public FriendDto(User u) {
            this.id = u.getId();
            this.username = u.getUsername();
            this.avatarUrl = u.getAvatarUrl();
            this.online = u.isOnline();
            this.gamesPlayed = u.getGamesPlayed();
            this.gamesWon = u.getGamesWon();
            this.fastestSolveTimeSeconds = u.getFastestSolveTimeSeconds();
        }
    }

    public static class PendingRequestDto {
        public Long requestId;
        public String senderUsername;
        public String senderAvatarUrl;

        public PendingRequestDto(Friendship f) {
            this.requestId = f.getId();
            this.senderUsername = f.getUser().getUsername();
            this.senderAvatarUrl = f.getUser().getAvatarUrl();
        }
    }

    public static class SearchResultDto {
        public String username;
        public String avatarUrl;
        public String relationStatus; // "NONE", "PENDING_SENT", "PENDING_RECEIVED", "ACCEPTED"

        public SearchResultDto(User u, String relationStatus) {
            this.username = u.getUsername();
            this.avatarUrl = u.getAvatarUrl();
            this.relationStatus = relationStatus;
        }
    }

    @PostMapping("/request")
    public ResponseEntity<?> sendFriendRequest(
            @AuthenticationPrincipal User authUser,
            @RequestParam String username) {
        
        Optional<User> senderOpt = userRepository.findById(authUser.getId());
        Optional<User> recipientOpt = userRepository.findByUsername(username);

        if (senderOpt.isEmpty() || recipientOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }

        User sender = senderOpt.get();
        User recipient = recipientOpt.get();

        if (sender.getId().equals(recipient.getId())) {
            return ResponseEntity.badRequest().body("You cannot add yourself as a friend");
        }

        Optional<Friendship> existing = friendshipRepository.findRelation(sender, recipient);
        if (existing.isPresent()) {
            Friendship relation = existing.get();
            if (relation.getStatus().equals("ACCEPTED")) {
                return ResponseEntity.badRequest().body("You are already friends");
            } else {
                return ResponseEntity.badRequest().body("A friend request is already pending or sent");
            }
        }

        Friendship friendship = new Friendship(sender, recipient, "PENDING");
        friendshipRepository.save(friendship);

        return ResponseEntity.ok("Friend request sent successfully");
    }

    @PostMapping("/respond")
    public ResponseEntity<?> respondToRequest(
            @AuthenticationPrincipal User authUser,
            @RequestParam Long requestId,
            @RequestParam String action) {

        Optional<Friendship> friendshipOpt = friendshipRepository.findById(requestId);
        if (friendshipOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Friendship friendship = friendshipOpt.get();
        // Verify recipient is the current authenticated user
        if (!friendship.getFriend().getId().equals(authUser.getId())) {
            return ResponseEntity.status(403).body("Unauthorized to respond to this request");
        }

        if ("ACCEPT".equalsIgnoreCase(action)) {
            friendship.setStatus("ACCEPTED");
            friendshipRepository.save(friendship);
            return ResponseEntity.ok("Friend request accepted");
        } else {
            friendshipRepository.delete(friendship);
            return ResponseEntity.ok("Friend request declined");
        }
    }

    @GetMapping
    public ResponseEntity<List<FriendDto>> getFriends(@AuthenticationPrincipal User authUser) {
        Optional<User> dbUserOpt = userRepository.findById(authUser.getId());
        if (dbUserOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = dbUserOpt.get();

        List<Friendship> friendships = friendshipRepository.findFriends(user, "ACCEPTED");
        List<FriendDto> friendsList = friendships.stream()
                .map(f -> {
                    User other = f.getUser().getId().equals(user.getId()) ? f.getFriend() : f.getUser();
                    return new FriendDto(other);
                })
                .sorted((f1, f2) -> {
                    // Sort online friends first, then alphabetically
                    if (f1.online && !f2.online) return -1;
                    if (!f1.online && f2.online) return 1;
                    return f1.username.compareToIgnoreCase(f2.username);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(friendsList);
    }

    @GetMapping("/requests/pending")
    public ResponseEntity<List<PendingRequestDto>> getPendingRequests(@AuthenticationPrincipal User authUser) {
        Optional<User> dbUserOpt = userRepository.findById(authUser.getId());
        if (dbUserOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = dbUserOpt.get();

        List<Friendship> pending = friendshipRepository.findPendingRequestsReceived(user);
        List<PendingRequestDto> result = pending.stream()
                .map(PendingRequestDto::new)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{username}")
    public ResponseEntity<?> removeFriend(
            @AuthenticationPrincipal User authUser,
            @PathVariable String username) {

        Optional<User> senderOpt = userRepository.findById(authUser.getId());
        Optional<User> recipientOpt = userRepository.findByUsername(username);

        if (senderOpt.isEmpty() || recipientOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("User not found");
        }

        User sender = senderOpt.get();
        User recipient = recipientOpt.get();

        Optional<Friendship> existing = friendshipRepository.findRelation(sender, recipient);
        if (existing.isPresent()) {
            friendshipRepository.delete(existing.get());
            return ResponseEntity.ok("Friend removed successfully");
        }

        return ResponseEntity.badRequest().body("Friend relationship not found");
    }

    @GetMapping("/search")
    public ResponseEntity<List<SearchResultDto>> searchUsers(
            @AuthenticationPrincipal User authUser,
            @RequestParam String query) {

        Optional<User> dbUserOpt = userRepository.findById(authUser.getId());
        if (dbUserOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User currentUser = dbUserOpt.get();

        if (query.trim().length() < 2) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        // Search users containing query (excluding current user)
        List<User> foundUsers = userRepository.findByUsernameContainingIgnoreCase(query).stream()
                .filter(u -> !u.getId().equals(currentUser.getId()))
                .limit(10)
                .collect(Collectors.toList());

        List<SearchResultDto> results = foundUsers.stream().map(u -> {
            Optional<Friendship> relation = friendshipRepository.findRelation(currentUser, u);
            String status = "NONE";
            if (relation.isPresent()) {
                Friendship f = relation.get();
                if (f.getStatus().equals("ACCEPTED")) {
                    status = "ACCEPTED";
                } else if (f.getUser().getId().equals(currentUser.getId())) {
                    status = "PENDING_SENT";
                } else {
                    status = "PENDING_RECEIVED";
                }
            }
            return new SearchResultDto(u, status);
        }).collect(Collectors.toList());

        return ResponseEntity.ok(results);
    }
}
