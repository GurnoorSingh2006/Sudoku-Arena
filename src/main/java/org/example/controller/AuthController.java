package org.example.controller;

import org.example.model.User;
import org.example.repository.UserRepository;
import org.example.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Username is already taken");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Email is already registered");
        }

        // Set default avatar if none provided
        String avatar = "https://api.dicebear.com/7.x/bottts/svg?seed=" + request.getUsername();

        User user = new User(
                request.getUsername(),
                request.getEmail(),
                passwordEncoder.encode(request.getPassword()),
                avatar
        );

        userRepository.save(user);
        String token = jwtUtil.generateToken(user.getUsername());

        return ResponseEntity.ok(new AuthResponse(token, user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // Allow login with either username or email
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmail(request.getUsername());
        }

        if (userOpt.isEmpty() || !passwordEncoder.matches(request.getPassword(), userOpt.get().getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid username or password");
        }

        User user = userOpt.get();
        String token = jwtUtil.generateToken(user.getUsername());

        return ResponseEntity.ok(new AuthResponse(token, user));
    }

    /**
     * Endpoint for custom Google OAuth Sign-in integration
     */
    @PostMapping("/google")
    public ResponseEntity<?> googleSignIn(@RequestBody GoogleAuthRequest request) {
        // Look up by email
        Optional<User> userOpt = userRepository.findByEmail(request.getEmail());
        User user;

        if (userOpt.isEmpty()) {
            // Create user
            String username = request.getName().toLowerCase().replaceAll("\\s+", "");
            // Ensure username uniqueness
            if (userRepository.existsByUsername(username)) {
                username = username + "_" + (int)(Math.random() * 1000);
            }

            user = new User(
                    username,
                    request.getEmail(),
                    passwordEncoder.encode("google_oauth_placeholder_password_" + Math.random()),
                    request.getAvatarUrl()
            );
            userRepository.save(user);
        } else {
            user = userOpt.get();
            // Update avatar if changed
            if (request.getAvatarUrl() != null && !request.getAvatarUrl().isEmpty()) {
                user.setAvatarUrl(request.getAvatarUrl());
                userRepository.save(user);
            }
        }

        String token = jwtUtil.generateToken(user.getUsername());
        return ResponseEntity.ok(new AuthResponse(token, user));
    }

    // --- Request/Response DTOs ---

    public static class RegisterRequest {
        private String username;
        private String email;
        private String password;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class LoginRequest {
        private String username; // can be username or email
        private String password;

        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class GoogleAuthRequest {
        private String email;
        private String name;
        private String avatarUrl;

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    }

    public static class AuthResponse {
        private String token;
        private Long id;
        private String username;
        private String email;
        private String avatarUrl;

        public AuthResponse(String token, User user) {
            this.token = token;
            this.id = user.getId();
            this.username = user.getUsername();
            this.email = user.getEmail();
            this.avatarUrl = user.getAvatarUrl();
        }

        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
        public String getAvatarUrl() { return avatarUrl; }
        public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    }
}
