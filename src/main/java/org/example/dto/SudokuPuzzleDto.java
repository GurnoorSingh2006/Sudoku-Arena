package org.example.dto;

public class SudokuPuzzleDto {
    private int[][] board;
    private int[][] solution;
    private String difficulty;

    public SudokuPuzzleDto() {}

    public SudokuPuzzleDto(int[][] board, int[][] solution, String difficulty) {
        this.board = board;
        this.solution = solution;
        this.difficulty = difficulty;
    }

    // Getters and Setters
    public int[][] getBoard() { return board; }
    public void setBoard(int[][] board) { this.board = board; }

    public int[][] getSolution() { return solution; }
    public void setSolution(int[][] solution) { this.solution = solution; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
}
