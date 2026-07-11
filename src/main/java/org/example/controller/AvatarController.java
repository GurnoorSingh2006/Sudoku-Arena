package org.example.controller;

import org.example.model.User;
import org.example.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/avatars")
public class AvatarController {

    @Autowired
    private UserRepository userRepository;

    public static class AvatarConfig {
        public String id;
        public String name;
        public String url;
        public String category;
        public String unlockCondition;

        public AvatarConfig(String id, String name, String url, String category, String unlockCondition) {
            this.id = id;
            this.name = name;
            this.url = url;
            this.category = category;
            this.unlockCondition = unlockCondition;
        }
    }

    public static final List<AvatarConfig> AVATARS = new ArrayList<>();

    static {
        // Robots
        AVATARS.add(new AvatarConfig("bottts_1", "Robo-One", "https://api.dicebear.com/7.x/bottts/svg?seed=Robot1", "Robots", "Unlocked by default"));
        AVATARS.add(new AvatarConfig("bottts_2", "Robo-Two", "https://api.dicebear.com/7.x/bottts/svg?seed=Robot2", "Robots", "Unlocked by default"));
        AVATARS.add(new AvatarConfig("bottts_3", "Arena Bot", "https://api.dicebear.com/7.x/bottts/svg?seed=Gurnoor", "Robots", "Unlocked by default"));
        AVATARS.add(new AvatarConfig("bottts_4", "Neon Spark", "https://api.dicebear.com/7.x/bottts/svg?seed=Arena", "Robots", "Unlocked by default"));
        AVATARS.add(new AvatarConfig("bottts_5", "Matrix", "https://api.dicebear.com/7.x/bottts/svg?seed=Sudoku", "Robots", "Unlocked by default"));

        // Chess
        AVATARS.add(new AvatarConfig("chess_king", "King", "https://api.dicebear.com/7.x/initials/svg?seed=K&backgroundColor=f59e0b", "Chess", "Unlocked by default"));
        AVATARS.add(new AvatarConfig("chess_pawn", "Pawn", "https://api.dicebear.com/7.x/initials/svg?seed=P&backgroundColor=64748b", "Chess", "Unlocked by default"));
        AVATARS.add(new AvatarConfig("chess_queen", "Queen", "https://api.dicebear.com/7.x/initials/svg?seed=Q&backgroundColor=ec4899", "Chess", "Win 5 matches"));
        AVATARS.add(new AvatarConfig("chess_rook", "Rook", "https://api.dicebear.com/7.x/initials/svg?seed=R&backgroundColor=3b82f6", "Chess", "Win 10 matches"));
        AVATARS.add(new AvatarConfig("chess_knight", "Knight", "https://api.dicebear.com/7.x/initials/svg?seed=N&backgroundColor=10b981", "Chess", "Win 15 matches"));

        // Animals
        AVATARS.add(new AvatarConfig("animal_cat", "Neko Cat", "https://api.dicebear.com/7.x/shapes/svg?seed=Cat", "Animals", "Unlocked by default"));
        AVATARS.add(new AvatarConfig("animal_dog", "Doge", "https://api.dicebear.com/7.x/shapes/svg?seed=Dog", "Animals", "Win 2 matches"));
        AVATARS.add(new AvatarConfig("animal_fox", "Kitsune Fox", "https://api.dicebear.com/7.x/shapes/svg?seed=Fox", "Animals", "Win 8 matches"));
        AVATARS.add(new AvatarConfig("animal_panda", "Panda Bear", "https://api.dicebear.com/7.x/shapes/svg?seed=Panda", "Animals", "Win 12 matches"));
        AVATARS.add(new AvatarConfig("animal_dragon", "Fire Dragon", "https://api.dicebear.com/7.x/shapes/svg?seed=Dragon", "Animals", "Win 20 matches"));

        // Fantasy
        AVATARS.add(new AvatarConfig("fantasy_goblin", "Grumble Goblin", "https://api.dicebear.com/7.x/adventurer/svg?seed=Goblin", "Fantasy", "Unlocked by default"));
        AVATARS.add(new AvatarConfig("fantasy_wizard", "Archmage", "https://api.dicebear.com/7.x/adventurer/svg?seed=Wizard", "Fantasy", "Solve an Expert puzzle"));
        AVATARS.add(new AvatarConfig("fantasy_warrior", "Berserker", "https://api.dicebear.com/7.x/adventurer/svg?seed=Warrior", "Fantasy", "Solve a Hard puzzle"));
        AVATARS.add(new AvatarConfig("fantasy_elf", "Windrunner", "https://api.dicebear.com/7.x/adventurer/svg?seed=Elf", "Fantasy", "Solve a Medium puzzle"));
        AVATARS.add(new AvatarConfig("fantasy_phoenix", "Fallen Phoenix", "https://api.dicebear.com/7.x/adventurer/svg?seed=Phoenix", "Fantasy", "Solve a Daily Challenge"));

        // Special
        AVATARS.add(new AvatarConfig("special_survivor", "Mistake Survivor", "https://api.dicebear.com/7.x/pixel-art/svg?seed=Survivor", "Special", "Unlocked by default"));
        AVATARS.add(new AvatarConfig("special_expert", "Sudoku Sage", "https://api.dicebear.com/7.x/pixel-art/svg?seed=Expert", "Special", "Solve a puzzle under 5 minutes"));
        AVATARS.add(new AvatarConfig("special_champion", "Grand Champion", "https://api.dicebear.com/7.x/pixel-art/svg?seed=Champion", "Special", "Win 30 matches"));
        AVATARS.add(new AvatarConfig("special_challenger", "Apex Challenger", "https://api.dicebear.com/7.x/pixel-art/svg?seed=Challenger", "Special", "Win 3 Multiplayer matches"));
        AVATARS.add(new AvatarConfig("special_flawless_expert", "Mind Master", "https://api.dicebear.com/7.x/pixel-art/svg?seed=Mind", "Special", "Solve under 5m Expert with no hints"));
        AVATARS.add(new AvatarConfig("special_veteran", "Veteran Solver", "https://api.dicebear.com/7.x/pixel-art/svg?seed=Veteran", "Special", "Complete 50 matches"));
    }

    public static class AvatarInfo {
        public String id;
        public String name;
        public String url;
        public String category;
        public String unlockCondition;
        public boolean unlocked;
        public boolean equipped;

        public AvatarInfo(AvatarConfig config, boolean unlocked, boolean equipped) {
            this.id = config.id;
            this.name = config.name;
            this.url = config.url;
            this.category = config.category;
            this.unlockCondition = config.unlockCondition;
            this.unlocked = unlocked;
            this.equipped = equipped;
        }
    }

    @GetMapping
    public ResponseEntity<List<AvatarInfo>> getAvatars(@AuthenticationPrincipal User authUser) {
        Optional<User> dbUserOpt = userRepository.findById(authUser.getId());
        if (dbUserOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = dbUserOpt.get();
        Set<String> unlocked = user.getUnlockedAvatars();
        String currentAvatarUrl = user.getAvatarUrl();

        List<AvatarInfo> result = new ArrayList<>();
        for (AvatarConfig config : AVATARS) {
            boolean isUnlocked = unlocked.contains(config.id);
            // Check if currentAvatarUrl exactly matches the config url, or starts with it to prevent small query-param mismatches
            boolean isEquipped = config.url.equalsIgnoreCase(currentAvatarUrl);
            result.add(new AvatarInfo(config, isUnlocked, isEquipped));
        }

        return ResponseEntity.ok(result);
    }

    @PostMapping("/equip")
    public ResponseEntity<?> equipAvatar(
            @AuthenticationPrincipal User authUser,
            @RequestParam String avatarId) {
        Optional<User> dbUserOpt = userRepository.findById(authUser.getId());
        if (dbUserOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User user = dbUserOpt.get();

        if (!user.getUnlockedAvatars().contains(avatarId)) {
            return ResponseEntity.badRequest().body("Avatar is locked. Meet achievements to unlock!");
        }

        AvatarConfig matched = null;
        for (AvatarConfig config : AVATARS) {
            if (config.id.equals(avatarId)) {
                matched = config;
                break;
            }
        }

        if (matched == null) {
            return ResponseEntity.badRequest().body("Avatar ID not found");
        }

        user.setAvatarUrl(matched.url);
        userRepository.save(user);

        return ResponseEntity.ok(user);
    }
}
