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
  const row1 = [1, 2, 3, 4, 5];
  const row2 = [6, 7, 8, 9];

  const renderButton = (num: number) => {
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
          relative flex-1 flex flex-col items-center justify-center py-3 sm:py-4 rounded-xl border font-extrabold text-xl sm:text-2xl transition-all duration-200 outline-none select-none max-w-[80px]
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
            text-[10px] font-bold mt-[2px]
            ${isCurrentSelected ? "text-indigo-200" : isFinished ? "text-slate-300 dark:text-slate-800" : "text-slate-400 dark:text-slate-500"}
          `}
        >
          ({remaining})
        </span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2.5 w-full max-w-[460px] mx-auto mt-5 px-2">
      <div className="flex justify-center gap-2.5 w-full">
        {row1.map(renderButton)}
      </div>
      <div className="flex justify-center gap-2.5 w-full">
        {row2.map(renderButton)}
      </div>
    </div>
  );
}
