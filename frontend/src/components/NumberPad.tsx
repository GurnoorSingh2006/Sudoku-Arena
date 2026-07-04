"use client";

import React from "react";

interface NumberPadProps {
  numberCounts: number[]; // Index 1-9 represents remaining occurrences to be placed
  selectedNumber: number | null;
  onSelectNumber: (num: number) => void;
  isPaused: boolean;
  isCompleted: boolean;
}

export default function NumberPad({
  numberCounts,
  selectedNumber,
  onSelectNumber,
  isPaused,
  isCompleted,
}: NumberPadProps) {
  return (
    <div className="grid grid-cols-9 gap-1 sm:gap-2 w-full max-w-[460px] mx-auto mt-4 px-1">
      {Array.from({ length: 9 }, (_, idx) => idx + 1).map((num) => {
        const remaining = numberCounts[num];
        const isFinished = remaining === 0;
        const isCurrentSelected = selectedNumber === num;

        return (
          <button
            key={num}
            type="button"
            onClick={() => onSelectNumber(num)}
            disabled={isPaused || isCompleted || isFinished}
            className={`
              relative flex flex-col items-center justify-center py-2 sm:py-3 rounded-xl border font-bold text-lg sm:text-xl transition-all duration-200 outline-none select-none
              ${
                isCurrentSelected
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                  : isFinished
                  ? "bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 opacity-40 cursor-default scale-95"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm"
              }
            `}
          >
            {num}
            <span
              className={`
                text-[9px] font-medium mt-[1px]
                ${isCurrentSelected ? "text-indigo-200" : isFinished ? "text-slate-300 dark:text-slate-800" : "text-slate-400 dark:text-slate-500"}
              `}
            >
              ({remaining})
            </span>
          </button>
        );
      })}
    </div>
  );
}
