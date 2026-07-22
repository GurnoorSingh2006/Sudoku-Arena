import { useState, useEffect, useRef } from "react";
import { synth } from "@/utils/synth";

export interface SudokuState {
  board: number[][];
  notes: number[][][]; // 9x9 array containing array of candidate numbers (1-9)
}

export function useSudoku(
  initialGrid: number[][],
  solutionGrid: number[][],
  difficulty: string,
  onProgressUpdate?: (completed: number, mistakes: number, currentBoard: number[][]) => void,
  onGameComplete?: (time: number, mistakes: number, hints: number) => void
) {
  const [board, setBoard] = useState<number[][]>(() =>
    initialGrid.map((row) => [...row])
  );
  const [notes, setNotes] = useState<number[][][]>(() =>
    Array(9).fill(null).map(() => Array(9).fill(null).map(() => []))
  );

  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [noteMode, setNoteMode] = useState<boolean>(false);
  
  const [mistakeCount, setMistakeCount] = useState<number>(0);
  const [hintsUsed, setHintsUsed] = useState<number>(0);
  
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  // Undo/Redo double-stack
  const undoStack = useRef<SudokuState[]>([]);
  const redoStack = useRef<SudokuState[]>([]);

  // Settings
  const [autoCheck, setAutoCheck] = useState<boolean>(true);

  // Synchronize board state if initialGrid changes (e.g. new puzzle loaded)
  useEffect(() => {
    setBoard(initialGrid.map((row) => [...row]));
    setNotes(Array(9).fill(null).map(() => Array(9).fill(null).map(() => [])));
    setSelectedCell(null);
    setSelectedNumber(null);
    setMistakeCount(0);
    setHintsUsed(0);
    setTimerSeconds(0);
    setIsPaused(false);
    setIsCompleted(false);
    setIsGameOver(false);
    undoStack.current = [];
    redoStack.current = [];
  }, [JSON.stringify(initialGrid)]);

  // Timer effect
  useEffect(() => {
    if (isPaused || isCompleted || initialGrid.length === 0) return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, isCompleted, initialGrid.length]);

  // Calculate filled cells count
  const getCompletedCellsCount = (currentBoard: number[][]) => {
    let count = 0;
    if (currentBoard.length < 9 || solutionGrid.length < 9) return 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (currentBoard[r][c] !== 0 && currentBoard[r][c] === solutionGrid[r][c]) {
          count++;
        }
      }
    }
    return count;
  };

  // Helper to push to undo stack
  const saveState = (newBoard: number[][], newNotes: number[][][]) => {
    undoStack.current.push({
      board: board.map((r) => [...r]),
      notes: notes.map((r) => r.map((c) => [...c])),
    });
    // Clear redo stack on new action
    redoStack.current = [];
    setBoard(newBoard);
    setNotes(newNotes);
  };

  const selectCell = (row: number, col: number) => {
    if (isPaused || isCompleted || isGameOver) return;
    setSelectedCell({ row, col });
    const cellVal = board[row][col];
    setSelectedNumber(cellVal !== 0 ? cellVal : null);
    if (synth) synth.playClick();
  };

  const selectNumber = (num: number) => {
    if (isPaused || isCompleted || isGameOver) return;
    setSelectedNumber(num);
    
    // If a cell is currently selected, write into it
    if (selectedCell) {
      enterNumberAt(selectedCell.row, selectedCell.col, num);
    }
  };

  const enterNumberAt = (row: number, col: number, num: number) => {
    if (isPaused || isCompleted || isGameOver) return;
    // Original locked cells cannot be modified
    if (initialGrid[row][col] !== 0) return;

    const currentVal = board[row][col];

    if (noteMode) {
      // Note Mode toggle
      const newNotes = notes.map((r) => r.map((c) => [...c]));
      const cellNotes = newNotes[row][col];
      
      if (cellNotes.includes(num)) {
        newNotes[row][col] = cellNotes.filter((x) => x !== num);
      } else {
        newNotes[row][col] = [...cellNotes, num].sort();
      }

      // If number is written as note, clear current cell main digit
      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = 0;

      saveState(newBoard, newNotes);
      if (synth) synth.playClick();
    } else {
      // Normal Mode number write
      if (currentVal === num) return; // Same number, do nothing

      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = num;

      // Clear notes in this cell since we entered a value
      const newNotes = notes.map((r) => r.map((c) => [...c]));
      newNotes[row][col] = [];

      // Automatically clean up this number from notes in its row, column, and box
      removeNoteFromPeers(newNotes, row, col, num);

      // Check for mistakes
      let isMistake = false;
      let newMistakes = mistakeCount;
      if (num !== 0 && solutionGrid[row][col] !== num) {
        isMistake = true;
        newMistakes = mistakeCount + 1;
        setMistakeCount(newMistakes);
        if (synth) synth.playMistake();
        
        if (newMistakes >= 3) {
          setIsGameOver(true);
        }
      } else if (num !== 0) {
        if (synth) synth.playChime();
      }

      saveState(newBoard, newNotes);

      // Report progress (multiplayer hook)
      if (onProgressUpdate) {
        const completed = getCompletedCellsCount(newBoard);
        onProgressUpdate(completed, newMistakes, newBoard);
      }

      // Check if board solved
      checkWinCondition(newBoard, newMistakes);
    }
  };

  const removeNoteFromPeers = (currentNotes: number[][][], row: number, col: number, num: number) => {
    // Clear in row
    for (let c = 0; c < 9; c++) {
      currentNotes[row][c] = currentNotes[row][c].filter((n) => n !== num);
    }
    // Clear in col
    for (let r = 0; r < 9; r++) {
      currentNotes[r][col] = currentNotes[r][col].filter((n) => n !== num);
    }
    // Clear in 3x3 subgrid
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        currentNotes[r][c] = currentNotes[r][c].filter((n) => n !== num);
      }
    }
  };

  const clearCell = () => {
    if (!selectedCell || isPaused || isCompleted) return;
    const { row, col } = selectedCell;
    
    // Original locked cells cannot be cleared
    if (initialGrid[row][col] !== 0) return;

    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = 0;

    const newNotes = notes.map((r) => r.map((c) => [...c]));
    newNotes[row][col] = [];

    saveState(newBoard, newNotes);
    if (synth) synth.playClick();

    if (onProgressUpdate) {
      onProgressUpdate(getCompletedCellsCount(newBoard), mistakeCount, newBoard);
    }
  };

  const undo = () => {
    if (undoStack.current.length === 0 || isPaused || isCompleted) return;
    
    const previous = undoStack.current.pop()!;
    redoStack.current.push({
      board: board.map((r) => [...r]),
      notes: notes.map((r) => r.map((c) => [...c])),
    });

    setBoard(previous.board);
    setNotes(previous.notes);
    if (synth) synth.playClick();

    if (onProgressUpdate) {
      onProgressUpdate(getCompletedCellsCount(previous.board), mistakeCount, previous.board);
    }
  };

  const redo = () => {
    if (redoStack.current.length === 0 || isPaused || isCompleted) return;

    const next = redoStack.current.pop()!;
    undoStack.current.push({
      board: board.map((r) => [...r]),
      notes: notes.map((r) => r.map((c) => [...c])),
    });

    setBoard(next.board);
    setNotes(next.notes);
    if (synth) synth.playClick();

    if (onProgressUpdate) {
      onProgressUpdate(getCompletedCellsCount(next.board), mistakeCount, next.board);
    }
  };

  const toggleNoteMode = () => {
    setNoteMode(!noteMode);
    if (synth) synth.playClick();
  };

  const giveHint = () => {
    if (isPaused || isCompleted || isGameOver) return;
    
    // Find target cell to hint
    let targetRow = -1;
    let targetCol = -1;

    if (selectedCell && board[selectedCell.row][selectedCell.col] === 0) {
      targetRow = selectedCell.row;
      targetCol = selectedCell.col;
    } else {
      // Find a random empty cell
      const empties: {r: number, c: number}[] = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] === 0) {
            empties.push({r, c});
          }
        }
      }
      
      if (empties.length === 0) return;
      const target = empties[Math.floor(Math.random() * empties.length)];
      targetRow = target.r;
      targetCol = target.c;
    }

    const correctVal = solutionGrid[targetRow][targetCol];
    setHintsUsed((prev) => prev + 1);

    const newBoard = board.map((r) => [...r]);
    newBoard[targetRow][targetCol] = correctVal;

    const newNotes = notes.map((r) => r.map((c) => [...c]));
    newNotes[targetRow][targetCol] = [];
    removeNoteFromPeers(newNotes, targetRow, targetCol, correctVal);

    saveState(newBoard, newNotes);
    if (synth) {
      synth.playChime();
    }

    if (onProgressUpdate) {
      onProgressUpdate(getCompletedCellsCount(newBoard), mistakeCount, newBoard);
    }

    checkWinCondition(newBoard, mistakeCount);
  };

  const autoSolve = () => {
    if (isCompleted) return;
    
    const newBoard = solutionGrid.map((r) => [...r]);
    const newNotes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => []));
    
    setBoard(newBoard);
    setNotes(newNotes);
    setIsCompleted(true);
    if (synth) synth.playSuccess();

    if (onProgressUpdate) {
      onProgressUpdate(81, mistakeCount, newBoard);
    }

    if (onGameComplete) {
      onGameComplete(timerSeconds, mistakeCount, hintsUsed);
    }
  };

  const resetPuzzle = () => {
    const newBoard = initialGrid.map((row) => [...row]);
    const newNotes = Array(9).fill(null).map(() => Array(9).fill(null).map(() => []));
    
    saveState(newBoard, newNotes);
    setSelectedCell(null);
    setMistakeCount(0);
    setIsGameOver(false);
    if (synth) synth.playClick();

    if (onProgressUpdate) {
      onProgressUpdate(getCompletedCellsCount(newBoard), 0, newBoard);
    }
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    if (synth) synth.playClick();
  };

  const checkWinCondition = (currentBoard: number[][], currentMistakes: number) => {
    // Board is won if all cells match the solution
    if (currentBoard.length < 9 || solutionGrid.length < 9) return;
    let win = true;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (currentBoard[r][c] !== solutionGrid[r][c]) {
          win = false;
          break;
        }
      }
      if (!win) break;
    }

    if (win) {
      setIsCompleted(true);
      if (synth) synth.playSuccess();
      if (onGameComplete) {
        onGameComplete(timerSeconds, currentMistakes, hintsUsed);
      }
    }
  };

  // Remaining instances of each digit 1-9 to place
  const getNumberCounts = () => {
    const counts = Array(10).fill(0);
    if (board.length < 9 || solutionGrid.length < 9) {
      return Array(10).fill(9);
    }
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = board[r][c];
        if (val !== 0 && val === solutionGrid[r][c]) {
          counts[val]++;
        }
      }
    }
    
    // Remaining counts (out of 9 instances)
    const remaining = Array(10).fill(9);
    for (let i = 1; i <= 9; i++) {
      remaining[i] = Math.max(0, 9 - counts[i]);
    }
    return remaining;
  };

  return {
    board,
    notes,
    selectedCell,
    selectedNumber,
    noteMode,
    mistakeCount,
    hintsUsed,
    timerSeconds,
    isPaused,
    isCompleted,
    isGameOver,
    autoCheck,
    setAutoCheck,
    selectCell,
    selectNumber,
    enterNumber: (num: number) => {
      if (selectedCell) enterNumberAt(selectedCell.row, selectedCell.col, num);
    },
    clearCell,
    undo,
    redo,
    toggleNoteMode,
    giveHint,
    autoSolve,
    resetPuzzle,
    togglePause,
    numberCounts: getNumberCounts(),
    hasUndo: undoStack.current.length > 0,
    hasRedo: redoStack.current.length > 0,
  };
}
