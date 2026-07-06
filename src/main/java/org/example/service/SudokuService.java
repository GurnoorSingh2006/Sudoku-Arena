package org.example.service;

import org.example.dto.SudokuPuzzleDto;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

@Service
public class SudokuService {
    private final Random random = new Random();

    /**
     * Generates a new Sudoku puzzle of the specified difficulty.
     */
    public SudokuPuzzleDto generatePuzzle(String difficulty) {
        return generatePuzzle(difficulty, this.random);
    }

    /**
     * Generates a seeded Sudoku puzzle of the specified difficulty for daily challenge.
     */
    public SudokuPuzzleDto generatePuzzleWithSeed(String difficulty, long seed) {
        return generatePuzzle(difficulty, new Random(seed));
    }

    /**
     * Core generator that accepts a Random instance.
     */
    public SudokuPuzzleDto generatePuzzle(String difficulty, Random rnd) {
        int[][] solvedBoard = new int[9][9];
        // Generate a fully filled board
        fillDiagonalBoxes(solvedBoard, rnd);
        solveBoard(solvedBoard, 0, 0, rnd);

        // Copy the solved board as the solution
        int[][] solution = copyBoard(solvedBoard);

        // Determine targets for clues to keep
        int cluesToKeep = switch (difficulty.toLowerCase()) {
            case "easy" -> 46;
            case "medium" -> 36;
            case "hard" -> 28;
            case "expert" -> 20;
            default -> 36;
        };

        int[][] puzzleBoard = removeNumbers(solvedBoard, cluesToKeep, rnd);
        return new SudokuPuzzleDto(puzzleBoard, solution, difficulty);
    }

    /**
     * Fills the three diagonal 3x3 boxes (top-left, middle, bottom-right).
     */
    private void fillDiagonalBoxes(int[][] board, Random rnd) {
        for (int i = 0; i < 9; i += 3) {
            fillBox(board, i, i, rnd);
        }
    }

    private void fillBox(int[][] board, int row, int col, Random rnd) {
        List<Integer> nums = new ArrayList<>();
        for (int i = 1; i <= 9; i++) nums.add(i);
        Collections.shuffle(nums, rnd);

        int index = 0;
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                board[row + i][col + j] = nums.get(index++);
            }
        }
    }

    /**
     * Standard solver to fill the board.
     */
    public boolean solveBoard(int[][] board, int row, int col, Random rnd) {
        if (row == 9) return true;
        if (col == 9) return solveBoard(board, row + 1, 0, rnd);
        if (board[row][col] != 0) return solveBoard(board, row, col + 1, rnd);

        List<Integer> nums = new ArrayList<>();
        for (int i = 1; i <= 9; i++) nums.add(i);
        Collections.shuffle(nums, rnd);

        for (int num : nums) {
            if (isSafe(board, row, col, num)) {
                board[row][col] = num;
                if (solveBoard(board, row, col + 1, rnd)) return true;
                board[row][col] = 0;
            }
        }
        return false;
    }

    /**
     * Helper to verify if a number is safe to place.
     */
    private boolean isSafe(int[][] board, int row, int col, int num) {
        for (int i = 0; i < 9; i++) {
            if (board[row][i] == num || board[i][col] == num) return false;
        }

        int startRow = 3 * (row / 3);
        int startCol = 3 * (col / 3);
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                if (board[startRow + i][startCol + j] == num) return false;
            }
        }
        return true;
    }

    /**
     * Removes numbers from the board while ensuring a unique solution.
     */
    private int[][] removeNumbers(int[][] board, int cluesToKeep, Random rnd) {
        int[][] puzzle = copyBoard(board);
        int cellsToRemove = 81 - cluesToKeep;

        // Create a list of all grid positions (0 to 80) and shuffle it
        List<Integer> cellPositions = new ArrayList<>();
        for (int i = 0; i < 81; i++) {
            cellPositions.add(i);
        }
        Collections.shuffle(cellPositions, rnd);

        int removedCount = 0;
        for (int pos : cellPositions) {
            if (removedCount >= cellsToRemove) {
                break;
            }

            int row = pos / 9;
            int col = pos % 9;

            int temp = puzzle[row][col];
            if (temp != 0) {
                puzzle[row][col] = 0;

                // Check uniqueness of solution
                int solutions = countSolutions(puzzle, 0, 0, 0, 2);

                if (solutions == 1) {
                    removedCount++;
                } else {
                    // Restore number if solution is not unique
                    puzzle[row][col] = temp;
                }
            }
        }
        return puzzle;
    }

    /**
     * Counts solutions up to a specified limit. Stopping early saves calculation time.
     */
    private int countSolutions(int[][] board, int row, int col, int count, int limit) {
        if (row == 9) {
            return count + 1;
        }
        if (col == 9) {
            return countSolutions(board, row + 1, 0, count, limit);
        }
        if (board[row][col] != 0) {
            return countSolutions(board, row, col + 1, count, limit);
        }

        for (int val = 1; val <= 9; val++) {
            if (isSafe(board, row, col, val)) {
                board[row][col] = val;
                count = countSolutions(board, row, col + 1, count, limit);
                board[row][col] = 0;

                if (count >= limit) {
                    return count;
                }
            }
        }
        return count;
    }

    private int[][] copyBoard(int[][] original) {
        int[][] copy = new int[9][9];
        for (int i = 0; i < 9; i++) {
            copy[i] = original[i].clone();
        }
        return copy;
    }
}
