"use client";

import React from "react";
import { Undo2, Redo2, Eraser, Pencil, Lightbulb } from "lucide-react";

interface GameControlsProps {
  noteMode: boolean;
  hasUndo: boolean;
  hasRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onToggleNoteMode: () => void;
  onHint: () => void;
  isPaused: boolean;
  isCompleted: boolean;
}

export default function GameControls({
  noteMode,
  hasUndo,
  hasRedo,
  onUndo,
  onRedo,
  onClear,
  onToggleNoteMode,
  onHint,
  isPaused,
  isCompleted,
}: GameControlsProps) {
  const btnClass = `
    flex flex-col items-center justify-center p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm
    text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500 dark:hover:border-indigo-400
    disabled:opacity-30 disabled:pointer-events-none transition-all duration-200 outline-none
  `;

  return (
    <div className="grid grid-cols-5 gap-2 w-full max-w-[460px] mx-auto mt-4 px-1">
      
      {/* Undo Button */}
      <button
        type="button"
        onClick={onUndo}
        disabled={isPaused || isCompleted || !hasUndo}
        className={btnClass}
        title="Undo"
      >
        <Undo2 className="w-5 h-5 mb-1" />
        <span className="text-[10px] font-semibold">Undo</span>
      </button>

      {/* Redo Button */}
      <button
        type="button"
        onClick={onRedo}
        disabled={isPaused || isCompleted || !hasRedo}
        className={btnClass}
        title="Redo"
      >
        <Redo2 className="w-5 h-5 mb-1" />
        <span className="text-[10px] font-semibold">Redo</span>
      </button>

      {/* Eraser Button */}
      <button
        type="button"
        onClick={onClear}
        disabled={isPaused || isCompleted}
        className={btnClass}
        title="Clear Cell"
      >
        <Eraser className="w-5 h-5 mb-1" />
        <span className="text-[10px] font-semibold">Erase</span>
      </button>

      {/* Pencil/Note Button */}
      <button
        type="button"
        onClick={onToggleNoteMode}
        disabled={isPaused || isCompleted}
        className={`
          flex flex-col items-center justify-center p-2 rounded-xl border shadow-sm transition-all duration-200 outline-none
          ${
            noteMode
              ? "bg-indigo-600 border-indigo-600 text-white shadow-indigo-500/20 shadow-md"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500 dark:hover:border-indigo-400"
          }
        `}
        title="Toggle Pencil Mode"
      >
        <div className="relative">
          <Pencil className="w-5 h-5 mb-1" />
          {noteMode && (
            <span className="absolute -top-[5px] -right-[15px] flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold">{noteMode ? "Notes: On" : "Notes: Off"}</span>
      </button>

      {/* Hint Button */}
      <button
        type="button"
        onClick={onHint}
        disabled={isPaused || isCompleted}
        className={btnClass}
        title="Get Hint"
      >
        <Lightbulb className="w-5 h-5 mb-1 text-amber-500" />
        <span className="text-[10px] font-semibold">Hint</span>
      </button>

    </div>
  );
}
