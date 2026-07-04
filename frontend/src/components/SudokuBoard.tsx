"use client";

import React, { useEffect } from "react";

interface SudokuBoardProps {
  board: number[][];
  notes: number[][][];
  initialBoard: number[][];
  solutionBoard: number[][];
  selectedCell: { row: number; col: number } | null;
  selectedNumber: number | null;
  onSelectCell: (row: number, col: number) => void;
  onEnterNumber: (num: number) => void;
  onClearCell: () => void;
  isPaused: boolean;
  isCompleted: boolean;
}

export default function SudokuBoard({
  board,
  notes,
  initialBoard,
  solutionBoard,
  selectedCell,
  selectedNumber,
  onSelectCell,
  onEnterNumber,
  onClearCell,
  isPaused,
  isCompleted,
}: SudokuBoardProps) {
  
  // Listen to keyboard controls
  useEffect(() => {
    if (isPaused || isCompleted || !selectedCell) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const { row, col } = selectedCell;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          onSelectCell(Math.max(0, row - 1), col);
          break;
        case "ArrowDown":
          e.preventDefault();
          onSelectCell(Math.min(8, row + 1), col);
          break;
        case "ArrowLeft":
          e.preventDefault();
          onSelectCell(row, Math.max(0, col - 1));
          break;
        case "ArrowRight":
          e.preventDefault();
          onSelectCell(row, Math.min(8, col + 1));
          break;
        case "Backspace":
        case "Delete":
          e.preventDefault();
          onClearCell();
          break;
        default:
          // Check if digits 1-9 pressed
          if (/^[1-9]$/.test(e.key)) {
            e.preventDefault();
            onEnterNumber(parseInt(e.key, 10));
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, isPaused, isCompleted, onSelectCell, onEnterNumber, onClearCell]);

  // Highlight check helpers
  const isPeer = (r: number, c: number) => {
    if (!selectedCell) return false;
    const { row, col } = selectedCell;
    if (r === row && c === col) return false; // Exclude self
    
    // Check same row, same col, or same 3x3 box
    const sameRow = r === row;
    const sameCol = c === col;
    const sameBox = Math.floor(r / 3) === Math.floor(row / 3) && 
                    Math.floor(c / 3) === Math.floor(col / 3);

    return sameRow || sameCol || sameBox;
  };

  const isSameNumberHighlight = (r: number, c: number, value: number) => {
    if (value === 0) return false;

    // Highlight if selected cell matches this value
    if (selectedCell) {
      const selectedVal = board[selectedCell.row][selectedCell.col];
      if (selectedVal === value) return true;
    }

    // Highlight if a specific number button is selected on the numpad
    if (selectedNumber !== null && selectedNumber === value) {
      return true;
    }

    return false;
  };

  return (
    <div className="relative w-full max-w-[460px] aspect-square mx-auto rounded-2xl overflow-hidden glass-panel-glow border-2 border-slate-300 dark:border-slate-700 p-[3px]">
      
      {/* Pause Overlay */}
      {isPaused && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-md rounded-2xl text-white">
          <svg className="w-16 h-16 text-indigo-400 mb-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
          </svg>
          <h3 className="text-2xl font-bold tracking-wider">GAME PAUSED</h3>
          <p className="text-slate-400 text-sm mt-1">Tap resume to continue playing</p>
        </div>
      )}

      {/* Grid Container */}
      <div className="grid grid-cols-9 h-full w-full bg-slate-200 dark:bg-slate-800 gap-[1px]">
        {board.map((rowArr, r) =>
          rowArr.map((val, c) => {
            const isSelected = selectedCell?.row === r && selectedCell?.col === c;
            const isLocked = initialBoard[r][c] !== 0;
            const isErr = val !== 0 && solutionBoard[r][c] !== val;
            const isHighlightedPeer = isPeer(r, c);
            const isSameNum = isSameNumberHighlight(r, c, val);
            
            // Subgrid visual division borders
            const borderRight = (c + 1) % 3 === 0 && c < 8;
            const borderBottom = (r + 1) % 3 === 0 && r < 8;

            // Highlight backgrounds
            let bgClass = "bg-white dark:bg-slate-900";
            if (isSelected) {
              bgClass = "bg-indigo-100 dark:bg-indigo-950/80 ring-2 ring-indigo-500 ring-inset z-10";
            } else if (isSameNum) {
              bgClass = "bg-indigo-50 dark:bg-indigo-900/40";
            } else if (isHighlightedPeer) {
              bgClass = "bg-slate-50 dark:bg-slate-950/50";
            }

            // Foreground colors
            let textClass = "text-slate-700 dark:text-slate-300 font-normal";
            if (isLocked) {
              textClass = "text-slate-900 dark:text-white font-bold";
            } else if (isErr) {
              textClass = "text-rose-600 dark:text-rose-400 font-semibold cell-error-wiggle";
            } else if (val !== 0) {
              textClass = "text-indigo-600 dark:text-indigo-400 font-semibold cell-place-pop";
            }

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => onSelectCell(r, c)}
                className={`
                  relative flex items-center justify-center aspect-square select-none outline-none text-xl sm:text-2xl transition-all duration-100
                  ${bgClass} ${textClass}
                  ${borderRight ? "sudoku-grid-thick-border-right" : ""}
                  ${borderBottom ? "sudoku-grid-thick-border-bottom" : ""}
                  hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20
                `}
                disabled={isPaused || isCompleted}
              >
                {/* Main value display */}
                {val !== 0 ? (
                  val
                ) : (
                  /* Pencil/Candidate marks display */
                  <div className="grid grid-cols-3 w-full h-full p-[2px] leading-none pointer-events-none">
                    {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => {
                      const hasNote = notes[r][c].includes(num);
                      const isCandidateSame = selectedNumber === num;
                      return (
                        <span
                          key={num}
                          className={`
                            flex items-center justify-center text-[9px] font-medium
                            ${hasNote ? "opacity-100Scale" : "opacity-0"}
                            ${isCandidateSame ? "text-indigo-600 dark:text-indigo-400 font-bold text-[10px]" : "text-slate-400 dark:text-slate-500"}
                          `}
                        >
                          {num}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
