package org.example.controller;

import org.example.dto.SudokuPuzzleDto;
import org.example.service.SudokuService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/sudoku")
public class SudokuController {

    @Autowired
    private SudokuService sudokuService;

    @GetMapping("/generate")
    public ResponseEntity<SudokuPuzzleDto> generatePuzzle(@RequestParam(defaultValue = "Medium") String difficulty) {
        SudokuPuzzleDto puzzle = sudokuService.generatePuzzle(difficulty);
        return ResponseEntity.ok(puzzle);
    }
}
