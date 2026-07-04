"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Trophy,
  Users,
  Play,
  LogOut,
  User as UserIcon,
  Zap,
  Clock,
  ChevronRight,
  Sun,
  Moon,
  Sparkles
} from "lucide-react";
import { apiFetch, clearAuthToken, getStoredUser, setStoredUser } from "@/utils/api";
import { synth } from "@/utils/synth";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [fastestLeaderboard, setFastestLeaderboard] = useState<any[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium");
  const [roomCodeToJoin, setRoomCodeToJoin] = useState("");
  const [joinError, setJoinError] = useState("");
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [theme, setTheme] = useState("light");

  // Authentication check and data fetch
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(stored);

    // Refresh profile details and fetch leaderboards
    const fetchData = async () => {
      try {
        const freshProfile = await apiFetch("/api/profile");
        setUser(freshProfile);
        setStoredUser({ ...stored, ...freshProfile });

        const topPlayers = await apiFetch("/api/leaderboard");
        setLeaderboard(topPlayers);

        const fastestTimes = await apiFetch("/api/leaderboard/fastest?difficulty=Medium");
        setFastestLeaderboard(fastestTimes);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };

    fetchData();

    // Check theme
    const savedTheme = localStorage.getItem("sudoku_theme") || "light";
    setTheme(savedTheme);
  }, [router]);

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

  const handleLogout = () => {
    if (synth) synth.playClick();
    clearAuthToken();
    router.push("/login");
  };

  const handleStartSinglePlayer = () => {
    if (synth) synth.playSuccess();
    router.push(`/play/single?difficulty=${selectedDifficulty}`);
  };

  const handleCreateMultiplayer = async () => {
    setLoadingRoom(true);
    if (synth) synth.playClick();
    try {
      const room = await apiFetch(`/api/rooms/create?difficulty=${selectedDifficulty}`, {
        method: "POST",
      });
      router.push(`/play/multi/${room.roomCode}`);
    } catch (err: any) {
      alert("Failed to create room: " + err.message);
    } finally {
      setLoadingRoom(false);
    }
  };

  const handleJoinMultiplayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCodeToJoin.trim()) return;
    setJoinError("");
    if (synth) synth.playClick();

    const code = roomCodeToJoin.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinError("Room code must be exactly 6 letters");
      return;
    }

    router.push(`/play/multi/${code}`);
  };

  const formatTime = (secs: number | null) => {
    if (secs === null || secs === undefined) return "--:--";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (!user) return null;

  const winRate = user.gamesPlayed > 0 ? Math.round((user.gamesWon / user.gamesPlayed) * 100) : 0;
  const avgSolveTime = user.gamesWon > 0 ? Math.round(user.totalSolveTimeSeconds / user.gamesWon) : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080d1a] py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-all duration-300">
      
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      {/* Header bar */}
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-8 pb-6 border-b border-slate-200/60 dark:border-slate-800/40 z-10 relative">
        <div className="flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-indigo-500 animate-spin-slow" />
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">
            Sudoku Arena
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md text-slate-700 dark:text-slate-200 hover:scale-105 transition-all cursor-pointer"
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200/50 dark:border-rose-900/30 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-sm font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 z-10 relative">
        
        {/* LEFT COLUMN: Profile Stats & Game Select */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Profile Overview Card */}
          <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                alt="Avatar"
                className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border-2 border-indigo-500/20 p-1 object-contain"
              />
              <div className="text-center sm:text-left flex-1">
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                  {user.username}
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-200/30">
                    Pro Player
                  </span>
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">{user.email}</p>
                <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start">
                  <span className="text-xs px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                    Easy Solved: <strong>{user.easyPuzzlesSolved}</strong>
                  </span>
                  <span className="text-xs px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                    Medium Solved: <strong>{user.mediumPuzzlesSolved}</strong>
                  </span>
                  <span className="text-xs px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                    Hard Solved: <strong>{user.hardPuzzlesSolved}</strong>
                  </span>
                  <span className="text-xs px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400">
                    Expert Solved: <strong>{user.expertPuzzlesSolved}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Statistics Mini Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200/50 dark:border-slate-800/40">
              <div className="bg-white/40 dark:bg-slate-900/20 border border-slate-200/30 p-4 rounded-xl text-center">
                <Play className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">Played</span>
                <span className="text-2xl font-extrabold">{user.gamesPlayed}</span>
              </div>
              <div className="bg-white/40 dark:bg-slate-900/20 border border-slate-200/30 p-4 rounded-xl text-center">
                <Trophy className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">Won</span>
                <span className="text-2xl font-extrabold">{user.gamesWon}</span>
              </div>
              <div className="bg-white/40 dark:bg-slate-900/20 border border-slate-200/30 p-4 rounded-xl text-center">
                <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">Win Rate</span>
                <span className="text-2xl font-extrabold">{winRate}%</span>
              </div>
              <div className="bg-white/40 dark:bg-slate-900/20 border border-slate-200/30 p-4 rounded-xl text-center">
                <Clock className="w-5 h-5 text-sky-500 mx-auto mb-1" />
                <span className="text-xs text-slate-400 uppercase tracking-wider block font-bold">Fastest</span>
                <span className="text-2xl font-extrabold">{formatTime(user.fastestSolveTimeSeconds)}</span>
              </div>
            </div>
          </section>

          {/* Setup Play Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Single Player setup */}
            <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500">
                  <UserIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">Single Player</h3>
                  <p className="text-xs text-slate-400">Play at your own pace</p>
                </div>
              </div>

              {/* Difficulty selector */}
              <div className="space-y-2 mb-8 flex-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["Easy", "Medium", "Hard", "Expert"].map((diff) => (
                    <button
                      key={diff}
                      type="button"
                      onClick={() => { setSelectedDifficulty(diff); if (synth) synth.playClick(); }}
                      className={`
                        py-3 px-4 rounded-xl border text-sm font-bold transition-all cursor-pointer
                        ${
                          selectedDifficulty === diff
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                        }
                      `}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStartSinglePlayer}
                className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20 hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="w-5 h-5 fill-white" /> Start Puzzle
              </button>
            </section>

            {/* Multiplayer setup */}
            <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-500">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">Play with Friends</h3>
                  <p className="text-xs text-slate-400">Compete in real-time matches</p>
                </div>
              </div>

              <div className="space-y-6 flex-1">
                {/* Host button */}
                <div>
                  <button
                    onClick={handleCreateMultiplayer}
                    disabled={loadingRoom}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {loadingRoom ? (
                      <span className="border-2 border-white/30 border-t-white rounded-full w-5 h-5 animate-spin" />
                    ) : (
                      <>Host Lobby ({selectedDifficulty})</>
                    )}
                  </button>
                </div>

                {/* Separation */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="px-2 bg-slate-50 dark:bg-[#0e1628] text-slate-500 dark:text-slate-400">
                      Or Join Room
                    </span>
                  </div>
                </div>

                {/* Join Form */}
                <form onSubmit={handleJoinMultiplayer} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={roomCodeToJoin}
                      onChange={(e) => setRoomCodeToJoin(e.target.value.toUpperCase())}
                      placeholder="ENTER CODE"
                      className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-950/40 text-center font-bold tracking-widest text-slate-900 dark:text-white uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold transition-all text-sm cursor-pointer"
                    >
                      Join
                    </button>
                  </div>
                  {joinError && (
                    <p className="text-xs text-rose-500 font-medium text-center">{joinError}</p>
                  )}
                </form>
              </div>
            </section>
          </div>
        </div>

        {/* RIGHT COLUMN: Global Leaderboard */}
        <div>
          <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg">Top Players</h3>
                <p className="text-xs text-slate-400">Global rankings by total wins</p>
              </div>
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1 flex-1">
              {leaderboard.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No records found. Solve a puzzle to begin!
                </div>
              ) : (
                leaderboard.map((player, idx) => {
                  const isSelf = player.username === user.username;
                  return (
                    <div
                      key={player.id}
                      className={`
                        flex items-center justify-between p-3 rounded-xl border transition-all duration-200
                        ${
                          isSelf
                            ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/30"
                            : "bg-white/40 dark:bg-slate-900/10 border-slate-100 dark:border-slate-900/50"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-400 w-5 text-center">
                          {idx + 1}
                        </span>
                        <img
                          src={player.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.username}`}
                          alt="Avatar"
                          className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 object-contain p-0.5"
                        />
                        <span className={`text-sm font-bold ${isSelf ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}>
                          {player.username}
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                          {player.gamesWon}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                          Wins
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            {/* Display user's personal placement hint */}
            <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/40 text-center">
              <span className="text-xs text-slate-400">
                Play matches to increase your ranking!
              </span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
