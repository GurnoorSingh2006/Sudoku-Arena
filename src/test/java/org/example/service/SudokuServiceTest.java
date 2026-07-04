package org.example.service;

import org.example.dto.SudokuPuzzleDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class SudokuServiceTest {

    @Autowired
    private SudokuService sudokuService;

    @Test
    public void testGeneratePuzzle() {
        SudokuPuzzleDto puzzle = sudokuService.generatePuzzle("Medium");

        assertNotNull(puzzle);
        assertNotNull(puzzle.getBoard());
        assertNotNull(puzzle.getSolution());
        assertEquals("Medium", puzzle.getDifficulty());

        // Verify dimensions
        assertEquals(9, puzzle.getBoard().length);
        assertEquals(9, puzzle.getBoard()[0].length);
        assertEquals(9, puzzle.getSolution().length);
        assertEquals(9, puzzle.getSolution()[0].length);

        // Verify that cells are cleared
        int emptyCount = 0;
        for (int i = 0; i < 9; i++) {
            for (int j = 0; j < 9; j++) {
                if (puzzle.getBoard()[i][j] == 0) {
                    emptyCount++;
                }
            }
        }
        assertTrue(emptyCount > 0, "Puzzle should contain empty cells");
    }
}
