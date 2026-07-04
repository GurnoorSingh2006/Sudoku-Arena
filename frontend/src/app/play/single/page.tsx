"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Clock, XCircle, Home, RotateCcw, HelpCircle, Eye, ArrowLeft } from "lucide-react";
import { apiFetch, getStoredUser } from "@/utils/api";
import { useSudoku } from "@/hooks/useSudoku";
import SudokuBoard from "@/components/SudokuBoard";
import NumberPad from "@/components/NumberPad";
import GameControls from "@/components/GameControls";
import { synth } from "@/utils/synth";

function SinglePlayerGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const difficulty = searchParams.get("difficulty") || "Medium";

  const [initialBoard, setInitialBoard] = useState<number[][]>([]);
  const [solutionBoard, setSolutionBoard] = useState<number[][]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // States for final match results modal
  const [showResults, setShowResults] = useState(false);
  const [resultTime, setResultTime] = useState(0);
  const [resultMistakes, setResultMistakes] = useState(0);
  const [resultHints, setResultHints] = useState(0);
  const [resultScore, setResultScore] = useState(0);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      router.push("/login");
      return;
    }
    setUser(storedUser);

    // Fetch initial random puzzle from Spring Boot REST endpoint
    const fetchPuzzle = async () => {
      try {
        setLoading(true);
        const data = await apiFetch(`/api/sudoku/generate?difficulty=${difficulty}`);
        setInitialBoard(data.board);
        setSolutionBoard(data.solution);
      } catch (err) {
        console.error("Failed to load puzzle:", err);
        alert("Failed to load puzzle. Please verify the backend is running.");
      } finally {
        setLoading(false);
      }
    };

    fetchPuzzle();
  }, [difficulty, router]);

  // Hook into gameplay state
  const {
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
    selectCell,
    selectNumber,
    enterNumber,
    clearCell,
    undo,
    redo,
    toggleNoteMode,
    giveHint,
    autoSolve,
    resetPuzzle,
    togglePause,
    numberCounts,
    hasUndo,
    hasRedo,
  } = useSudoku(
    initialBoard,
    solutionBoard,
    difficulty,
    undefined, // progress updates not required for single player
    async (finalTime, finalMistakes, finalHints) => {
      // Game solved callback
      const score = Math.max(0, 1000 + (1200 - finalTime) - (finalMistakes * 100));
      setResultTime(finalTime);
      setResultMistakes(finalMistakes);
      setResultHints(finalHints);
      setResultScore(score);
      setShowResults(true);

      // Save match record in database via profile REST endpoint
      try {
        await apiFetch("/api/profile/games", {
          method: "POST",
          body: JSON.stringify({
            difficulty,
            solveTimeSeconds: finalTime,
            mistakes: finalMistakes,
            hintsUsed: finalHints,
            score,
            win: true,
          }),
        });
      } catch (err) {
        console.error("Error saving game history:", err);
      }
    }
  );

  const handleReturnToDashboard = () => {
    if (synth) synth.playClick();
    router.push("/dashboard");
  };

  const handlePlayAgain = () => {
    if (synth) synth.playClick();
    setShowResults(false);
    // Reload same route to trigger fetch useEffect hook
    router.replace(`/play/single?difficulty=${difficulty}&reload=${Math.random()}`);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#080d1a]">
        <span className="border-4 border-indigo-200 border-t-indigo-600 rounded-full w-12 h-12 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">
          Generating Sudoku Puzzle...
        </h2>
        <p className="text-slate-400 text-sm mt-1">Ensuring a unique solution exists</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-[#080d1a] py-6 px-4 relative overflow-hidden transition-all duration-300">
      
      {/* Top Header Controls */}
      <header className="max-w-[480px] w-full mx-auto flex items-center justify-between mb-4">
        <button
          onClick={handleReturnToDashboard}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-extrabold border border-indigo-100/20">
            {difficulty}
          </span>
        </div>
      </header>

      {/* Game Statistics Bar */}
      <section className="max-w-[460px] w-full mx-auto grid grid-cols-3 gap-2 py-3 px-4 mb-4 rounded-2xl glass-panel text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800/40">
        <div className="flex items-center gap-1.5 justify-center">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span>{formatTime(timerSeconds)}</span>
        </div>
        <div className="flex items-center gap-1.5 justify-center border-x border-slate-200/50 dark:border-slate-800/40">
          <XCircle className="w-4 h-4 text-rose-500" />
          <span>Mistakes: {mistakeCount}</span>
        </div>
        <div className="flex items-center gap-1.5 justify-center">
          <HelpCircle className="w-4 h-4 text-amber-500" />
          <span>Hints: {hintsUsed}</span>
        </div>
      </section>

      {/* Main Grid */}
      <main className="flex-1 flex flex-col justify-center">
        <SudokuBoard
          board={board}
          notes={notes}
          initialBoard={initialBoard}
          solutionBoard={solutionBoard}
          selectedCell={selectedCell}
          selectedNumber={selectedNumber}
          onSelectCell={selectCell}
          onEnterNumber={enterNumber}
          onClearCell={clearCell}
          isPaused={isPaused}
          isCompleted={isCompleted}
        />

        {/* Action Controls */}
        <GameControls
          noteMode={noteMode}
          hasUndo={hasUndo}
          hasRedo={hasRedo}
          onUndo={undo}
          onRedo={redo}
          onClear={clearCell}
          onToggleNoteMode={toggleNoteMode}
          onHint={giveHint}
          isPaused={isPaused}
          isCompleted={isCompleted}
        />

        {/* Numpad */}
        <NumberPad
          numberCounts={numberCounts}
          selectedNumber={selectedNumber}
          onSelectNumber={selectNumber}
          isPaused={isPaused}
          isCompleted={isCompleted}
        />

        {/* Bottom Game Management Buttons */}
        <div className="flex gap-2 w-full max-w-[460px] mx-auto mt-6 px-1">
          <button
            onClick={togglePause}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold transition-all text-xs cursor-pointer"
          >
            {isPaused ? "Resume Timer" : "Pause Game"}
          </button>
          
          <button
            onClick={resetPuzzle}
            className="flex items-center justify-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-rose-500 transition-all cursor-pointer"
            title="Reset Board"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={autoSolve}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold transition-all text-xs cursor-pointer"
          >
            <Eye className="w-4 h-4" /> Solve Automatically
          </button>
        </div>
      </main>

      {/* Results Modal */}
      <AnimatePresence>
        {showResults && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel max-w-sm w-full rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 text-center shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-200/20">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                PUZZLE SOLVED!
              </h3>
              <p className="text-slate-400 text-sm mt-1">Excellent solving performance</p>

              {/* Stats Block */}
              <div className="grid grid-cols-2 gap-3 my-6 text-left">
                <div className="bg-slate-100 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/30">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                    Solve Time
                  </span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {formatTime(resultTime)}
                  </span>
                </div>

                <div className="bg-slate-100 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/30">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                    Mistakes
                  </span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {resultMistakes}
                  </span>
                </div>

                <div className="bg-slate-100 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/30">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                    Hints Used
                  </span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {resultHints}
                  </span>
                </div>

                <div className="bg-slate-100 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/30">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                    XP Score
                  </span>
                  <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                    +{resultScore} pts
                  </span>
                </div>
              </div>

              {/* Action options */}
              <div className="space-y-2">
                <button
                  onClick={handlePlayAgain}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Play Another Game
                </button>
                
                <button
                  onClick={handleReturnToDashboard}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all cursor-pointer"
                >
                  <Home className="w-4 h-4" /> Go to Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SinglePlayerGamePage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#080d1a]">
        <span className="border-4 border-indigo-200 border-t-indigo-600 rounded-full w-12 h-12 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Loading Game Session...</h2>
      </div>
    }>
      <SinglePlayerGameContent />
    </Suspense>
  );
}
