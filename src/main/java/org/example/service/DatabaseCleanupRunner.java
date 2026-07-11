package org.example.service;

import org.example.model.User;
import org.example.repository.GameHistoryRepository;
import org.example.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DatabaseCleanupRunner implements CommandLineRunner {

    @Autowired
    private GameHistoryRepository gameHistoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        System.out.println("--- Starting database runs cleanup (removing solves < 60 seconds) ---");
        
        try {
            // Delete all fast records under 1 minute
            gameHistoryRepository.deleteFastRuns();

            // Reset fastestSolveTimeSeconds for each user matching their valid best run
            for (User u : userRepository.findAll()) {
                Integer bestTime = gameHistoryRepository.findBestTimeByUser(u);
                u.setFastestSolveTimeSeconds(bestTime);
                userRepository.save(u);
            }
            System.out.println("--- Database runs cleanup completed successfully ---");
        } catch (Exception e) {
            System.err.println("--- Error during database runs cleanup: " + e.getMessage() + " ---");
        }
    }
}
