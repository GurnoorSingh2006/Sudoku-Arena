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
  Sparkles,
  Calendar,
  Check
} from "lucide-react";
import { apiFetch, clearAuthToken, getStoredUser, setStoredUser } from "@/utils/api";
import { synth } from "@/utils/synth";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [fastestLeaderboard, setFastestLeaderboard] = useState<any[]>([]);
  const [dailyLeaderboard, setDailyLeaderboard] = useState<any[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState<"global" | "fastest" | "daily">("global");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium");
  const [roomCodeToJoin, setRoomCodeToJoin] = useState("");
  const [joinError, setJoinError] = useState("");
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [theme, setTheme] = useState("light");
  const [dailyStatus, setDailyStatus] = useState<any>(null);

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

        // Fetch Daily challenge leaderboard
        try {
          const dailyL = await apiFetch("/api/leaderboard/daily");
          setDailyLeaderboard(dailyL);
        } catch (err) {
          console.error("Failed to load daily leaderboard:", err);
        }

        // Fetch Daily Challenge status
        try {
          const dailyData = await apiFetch("/api/sudoku/daily");
          setDailyStatus(dailyData);
        } catch (dailyErr) {
          console.error("Error fetching daily challenge:", dailyErr);
        }
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
  const formatSolveTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

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
          
          {/* Greeting & Quick Navigation Card */}
          <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 bg-gradient-to-br from-indigo-500/5 to-purple-500/5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
                <img
                  src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                  alt="Avatar"
                  className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200/20 p-1 object-contain"
                />
                <div>
                  <h2 className="text-xl font-black text-slate-800 dark:text-white">
                    Welcome back, {user.username}! 👋
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Ready for another challenge? Compare your solved times and metrics.</p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (synth) synth.playClick();
                  router.push("/profile");
                }}
                className="px-5 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl font-bold transition-all text-xs flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <UserIcon className="w-4 h-4 text-indigo-500" /> View Profile & Stats
              </button>
            </div>
          </section>

          {/* Setup Play Options */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Daily Challenge Card */}
            <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg">Daily Challenge</h3>
                    <p className="text-xs text-slate-400">Unique daily puzzle</p>
                  </div>
                </div>

                {dailyStatus ? (
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-slate-200/30 text-center">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Today's Date</span>
                      <span className="text-base font-extrabold text-slate-700 dark:text-slate-200">{dailyStatus.date}</span>
                      <span className="mt-2 text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-200/30 inline-block">
                        Difficulty: {dailyStatus.difficulty}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">Loading challenge...</div>
                )}
              </div>

              {dailyStatus && (
                dailyStatus.completed ? (
                  <div className="w-full text-center py-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/30 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" /> Completed Today!
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (synth) synth.playSuccess();
                      router.push("/play/single?difficulty=Daily");
                    }}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold shadow-md shadow-amber-500/20 hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-white" /> Play Challenge
                  </button>
                )
              )}
            </section>
            
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

        {/* RIGHT COLUMN: Tabbed Leaderboards */}
        <div>
          <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg">Arena Rankings</h3>
                <p className="text-xs text-slate-400">Compare with other players</p>
              </div>
            </div>

            {/* Leaderboard Tabs */}
            <div className="flex border-b border-slate-200/60 dark:border-slate-800/40 mb-4 text-xs font-bold">
              <button
                onClick={() => { if (synth) synth.playClick(); setLeaderboardTab("global"); }}
                className={`flex-1 pb-3 text-center transition-colors cursor-pointer ${leaderboardTab === "global" ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-slate-400 hover:text-slate-600"}`}
              >
                Global Wins
              </button>
              <button
                onClick={() => { if (synth) synth.playClick(); setLeaderboardTab("fastest"); }}
                className={`flex-1 pb-3 text-center transition-colors cursor-pointer ${leaderboardTab === "fastest" ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-slate-400 hover:text-slate-600"}`}
              >
                Fastest (Med)
              </button>
              <button
                onClick={() => { if (synth) synth.playClick(); setLeaderboardTab("daily"); }}
                className={`flex-1 pb-3 text-center transition-colors cursor-pointer ${leaderboardTab === "daily" ? "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold" : "text-slate-400 hover:text-slate-600"}`}
              >
                Daily Challenge
              </button>
            </div>

            {/* Leaderboard Entries List */}
            <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1 flex-1">
              {(() => {
                const getList = () => {
                  switch (leaderboardTab) {
                    case "global":
                      return leaderboard.map((player, idx) => ({
                        id: player.id,
                        username: player.username,
                        avatarUrl: player.avatarUrl,
                        value: `${player.gamesWon} wins`,
                        isSelf: player.username === user.username
                      }));
                    case "fastest":
                      return fastestLeaderboard.map((history, idx) => ({
                        id: history.id,
                        username: history.user?.username || "Unknown",
                        avatarUrl: history.user?.avatarUrl,
                        value: formatSolveTime(history.solveTimeSeconds),
                        isSelf: history.user?.username === user.username
                      }));
                    case "daily":
                      return dailyLeaderboard.map((history, idx) => ({
                        id: history.id,
                        username: history.user?.username || "Unknown",
                        avatarUrl: history.user?.avatarUrl,
                        value: formatSolveTime(history.solveTimeSeconds),
                        isSelf: history.user?.username === user.username
                      }));
                  }
                };

                const currentList = getList() || [];

                if (currentList.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-400 text-xs font-semibold">
                      No records found. Be the first to rank!
                    </div>
                  );
                }

                return currentList.map((player, idx) => (
                  <div
                    key={player.id || idx}
                    className={`
                      flex items-center justify-between p-3 rounded-xl border transition-all duration-200
                      ${
                        player.isSelf
                          ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-500/30"
                          : "bg-white/40 dark:bg-slate-900/10 border-slate-100 dark:border-slate-900/50"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-slate-400 w-5 text-center">
                        {idx + 1}
                      </span>
                      <img
                        src={player.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.username}`}
                        alt="Avatar"
                        className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 object-contain p-0.5 border border-slate-200/15"
                      />
                      <span className={`text-sm font-bold ${player.isSelf ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}>
                        {player.username}
                      </span>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                        {player.value}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
            
            {/* Display user's personal placement hint */}
            <div className="mt-6 pt-4 border-t border-slate-200/50 dark:border-slate-800/40 text-center">
              <span className="text-xs text-slate-400 font-semibold">
                Rankings refresh in real-time
              </span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
