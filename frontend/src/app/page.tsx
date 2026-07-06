"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Swords, User, ShieldAlert, Sparkles, Zap, Award, Sun, Moon } from "lucide-react";
import { getStoredUser } from "@/utils/api";
import { synth } from "@/utils/synth";

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [theme, setTheme] = useState("light");
  const [openRule, setOpenRule] = useState<number | null>(null);

  useEffect(() => {
    // Check if user is logged in
    const user = getStoredUser();
    setIsLoggedIn(!!user);

    // Check theme settings
    const saved = localStorage.getItem("sudoku_theme") || "light";
    setTheme(saved);
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("sudoku_theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    if (synth) synth.playClick();
  };

  const handleAction = (path: string) => {
    if (synth) synth.playSuccess();
    router.push(path);
  };

  // Pre-drawn premium 3x3 mockup grid for landing aesthetics
  const previewGrid = [
    [5, 3, 0],
    [6, 0, 0],
    [0, 9, 8],
  ];

  return (
    <div className="flex-1 flex flex-col justify-center min-h-screen bg-slate-50 dark:bg-[#080d1a] relative overflow-hidden transition-colors duration-300">
      
      {/* Visual background elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Floating Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-full border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:scale-105 transition-all duration-200 shadow-sm cursor-pointer z-20"
      >
        {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
        
        {/* Left Column: Title and Actions */}
        <div className="text-center lg:text-left space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-extrabold text-xs border border-indigo-100/20"
          >
            <Sparkles className="w-3.5 h-3.5" /> SUDOKU ARENA MVP IS LIVE
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-6xl font-black tracking-tight leading-tight"
          >
            Play Sudoku
            <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">
              With Your Friends.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-slate-500 dark:text-slate-400 text-lg max-w-lg mx-auto lg:mx-0"
          >
            Challenge yourself with single-player puzzles or compete head-to-head in real-time multiplayer matches using simple room invitation codes.
          </motion.p>

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
          >
            {isLoggedIn ? (
              <button
                onClick={() => handleAction("/dashboard")}
                className="flex items-center justify-center gap-2 py-4 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all cursor-pointer"
              >
                Go to Dashboard <Swords className="w-5 h-5" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleAction("/login")}
                  className="flex items-center justify-center gap-2 py-4 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/25 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Enter Arena <Swords className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => handleAction("/register")}
                  className="flex items-center justify-center gap-2 py-4 px-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-2xl font-bold shadow-sm hover:border-indigo-500 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Create Account <User className="w-5 h-5" />
                </button>
              </>
            )}
          </motion.div>
        </div>

        {/* Right Column: Dynamic Mockup graphic */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center"
        >
          <div className="relative glass-panel rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/40 w-full max-w-[380px] aspect-square shadow-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400">MULTIPLAYER LOBBY PREVIEW</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            </div>

            {/* Simulated mini grid */}
            <div className="grid grid-cols-3 gap-1 bg-slate-200 dark:bg-slate-800 p-2 rounded-2xl border border-slate-300 dark:border-slate-700">
              {previewGrid.map((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`${r}-${c}`}
                    className="aspect-square bg-white dark:bg-slate-950 flex items-center justify-center text-xl font-bold rounded-lg text-indigo-600 dark:text-indigo-400 shadow-sm"
                  >
                    {val !== 0 ? val : ""}
                  </div>
                ))
              )}
            </div>

            {/* Score bars mockup */}
            <div className="space-y-3 mt-6">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Player 1 (You)</span>
                <span className="text-indigo-600 dark:text-indigo-400">82%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full w-[82%]" />
              </div>

              <div className="flex items-center justify-between text-xs font-bold mt-2">
                <span>Player 2 (Opponent)</span>
                <span className="text-purple-600 dark:text-purple-400">65%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-600 h-full w-[65%]" />
              </div>
            </div>
          </div>
        </motion.div>

      </div>

      {/* Masterclass Rules Section */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 z-10 relative">
        <div className="text-center mb-10">
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold tracking-widest uppercase">Quick Masterclass</span>
          <h3 className="text-3xl font-black text-slate-800 dark:text-white mt-1">
            Sudoku Arena Guidelines
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "The Grid Structure",
              desc: "The board consists of a 9x9 grid divided into nine 3x3 boxes. Fill empty cells with digits from 1 to 9."
            },
            {
              title: "The Golden Rule",
              desc: "Every row, column, and 3x3 subgrid must contain the digits 1 through 9 exactly once, without repetition."
            },
            {
              title: "Candidate Notes",
              desc: "Stuck? Toggle 'Note Mode' (pencil icon) to jot down candidates in empty cells to keep track of possibilities."
            },
            {
              title: "Mistakes & Lives",
              desc: "Both single-player and multiplayer matches feature a 3-lives limit. Reaching 3 mistakes ends the game!"
            }
          ].map((rule, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -3 }}
              className="glass-panel p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 text-left hover:border-indigo-500/30 transition-all duration-300 shadow-sm"
            >
              <h4 className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400 mb-1.5 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-black">{idx + 1}</span>
                {rule.title}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-7">{rule.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Feature stats footer */}
      <footer className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 border-t border-slate-200/50 dark:border-slate-800/40 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left z-10">
        <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl bg-white/30 dark:bg-slate-900/10 border border-slate-200/20 shadow-sm">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl text-indigo-500">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm">Instant Matchmaking</h4>
            <p className="text-xs text-slate-400 mt-0.5">Join multiplayer lobbies in milliseconds</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl bg-white/30 dark:bg-slate-900/10 border border-slate-200/20 shadow-sm">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-500">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm">Competitive Leaderboards</h4>
            <p className="text-xs text-slate-400 mt-0.5">Rank up based on solve speed and accuracy</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-2xl bg-white/30 dark:bg-slate-900/10 border border-slate-200/20 shadow-sm">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-500">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm">Anti-Cheat Validation</h4>
            <p className="text-xs text-slate-400 mt-0.5">Verification calculations are executed server-side</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
