"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Check,
  Eye,
  Swords
} from "lucide-react";
import { Client } from "@stomp/stompjs";
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
  
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [friendsOnline, setFriendsOnline] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState("");
  
  const stompClient = useRef<Client | null>(null);
  const isConnected = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

        // Fetch Active Rooms
        try {
          const rooms = await apiFetch("/api/rooms/active");
          setActiveRooms(rooms.filter((r: any) => r.state === "PLAYING" || r.state === "WAITING" || r.state === "COUNTDOWN"));
        } catch (roomsErr) {
          console.error("Error fetching active rooms:", roomsErr);
        }

        // Fetch Online Friends
        try {
          const friendsList = await apiFetch("/api/friends");
          setFriendsOnline(friendsList.filter((f: any) => f.online));
        } catch (friendsErr) {
          console.error("Error fetching online friends:", friendsErr);
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

    // Setup WebSocket connection for sending challenge invitations
    const wsHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://${wsHost}:8080/ws`;
    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
    });

    client.onConnect = () => {
      isConnected.current = true;
      stompClient.current = client;
    };

    client.onDisconnect = () => {
      isConnected.current = false;
      stompClient.current = null;
    };

    client.activate();

    // Check theme
    const savedTheme = localStorage.getItem("sudoku_theme") || "light";
    setTheme(savedTheme);
  }, [router]);

  // Periodic ping loop every 20 seconds to report online status
  useEffect(() => {
    if (!user) return;
    const pingLoop = setInterval(async () => {
      try {
        await apiFetch("/api/profile/ping", { method: "POST" });
      } catch (e) {}
    }, 20000);
    return () => clearInterval(pingLoop);
  }, [user]);

  const handleChallengeDashboard = async (friendUsername: string) => {
    if (!stompClient.current || !isConnected.current) {
      alert("WebSocket connection is not ready yet. Please wait a moment.");
      return;
    }
    if (synth) synth.playClick();

    try {
      // 1. Create room
      const room = await apiFetch("/api/rooms/create?difficulty=Medium", { method: "POST" });
      
      // 2. Publish duel invite
      stompClient.current.publish({
        destination: "/app/friends/challenge",
        body: JSON.stringify({
          senderUsername: user.username,
          recipientUsername: friendUsername,
          roomCode: room.roomCode,
          difficulty: "Medium"
        })
      });

      // 3. Route to lobby
      router.push(`/play/multi/${room.roomCode}`);
    } catch (err: any) {
      console.error("Failed to challenge friend from dashboard:", err);
    }
  };

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
          
          {/* Gamified Welcome Card */}
          <section className="glass-panel rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/40 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-slate-900/10 shadow-premium relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left w-full md:w-auto">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-300" />
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                    alt="Avatar"
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 object-contain p-1 border border-indigo-200/20 relative z-10 bg-white"
                  />
                  <div className="absolute -top-2 -left-2 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-20 shadow-md">
                    Lvl {Math.max(1, Math.floor((user.gamesWon * 35 + user.gamesPlayed * 10) / 100) + 1)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center justify-center sm:justify-start gap-2">
                      {user.username}
                      <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold border border-indigo-200/10">
                        {user.gamesWon >= 50 ? "Grandmaster" : user.gamesWon >= 25 ? "Diamond" : user.gamesWon >= 15 ? "Platinum" : user.gamesWon >= 8 ? "Gold" : user.gamesWon >= 3 ? "Silver" : "Bronze"}
                      </span>
                    </h2>
                  </div>
                  
                  {/* XP Bar */}
                  <div className="mt-3 w-full sm:w-64">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                      <span>XP Progress</span>
                      <span>{((user.gamesWon * 35 + user.gamesPlayed * 10) % 100)} / 100 XP</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${((user.gamesWon * 35 + user.gamesPlayed * 10) % 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
                      />
                    </div>
                  </div>

                  {/* Daily Streak & Total Solves stats row */}
                  <div className="flex items-center gap-4 mt-4 text-[10px] uppercase font-bold text-slate-500 justify-center sm:justify-start">
                    <span className="flex items-center gap-1.5 text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/10">
                      🔥 {user.gamesWon > 0 ? (user.gamesWon % 5) + 2 : 1} Day Streak
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/10">
                      🎯 {user.gamesWon} Solves
                    </span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                <button
                  onClick={() => {
                    if (synth) synth.playClick();
                    router.push(`/play/single?difficulty=${selectedDifficulty}`);
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-500/15 active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> Resume Last
                </button>
                <button
                  onClick={() => {
                    if (synth) synth.playClick();
                    router.push("/profile");
                  }}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 text-indigo-500" /> Stats Page
                </button>
              </div>
            </div>
          </section>

          {/* Setup Play Options */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Daily Challenge Card */}
            <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-500">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg">Daily</h3>
                      <p className="text-xs text-slate-400">Unique daily puzzle</p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold px-1.5 py-0.5 rounded-md">
                    +50 XP
                  </span>
                </div>

                {dailyStatus ? (
                  <div className="space-y-4 mb-6">
                    <div className="p-4 bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-slate-200/30 text-center">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Time Left</span>
                      <span className="text-base font-extrabold text-slate-700 dark:text-slate-200 font-mono tracking-wider block mt-1">
                        {timeLeft || "--:--:--"}
                      </span>
                      <span className="mt-2 text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold border border-indigo-200/30 inline-block">
                        {dailyStatus.difficulty}
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
            <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg">Single Player</h3>
                    <p className="text-xs text-slate-400">Solve at your pace</p>
                  </div>
                </div>

                {/* Difficulty selector */}
                <div className="space-y-2 mb-6">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Select Difficulty
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Easy", "Medium", "Hard", "Expert"].map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => { setSelectedDifficulty(diff); if (synth) synth.playClick(); }}
                        className={`
                          py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left flex flex-col justify-between min-h-[58px]
                          ${
                            selectedDifficulty === diff
                              ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/10"
                              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700"
                          }
                        `}
                      >
                        <span>{diff}</span>
                        <span className={`text-[8px] font-semibold block uppercase tracking-wider ${selectedDifficulty === diff ? "text-indigo-200" : "text-slate-400"}`}>
                          {diff === "Easy" ? "5m avg" : diff === "Medium" ? "10m avg" : diff === "Hard" ? "15m avg" : "22m avg"}
                        </span>
                      </button>
                    ))}
                  </div>
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
            <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-500">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg">Sudoku Duel</h3>
                    <p className="text-xs text-slate-400">Play real-time multiplayer</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Host button */}
                  <div>
                    <button
                      onClick={handleCreateMultiplayer}
                      disabled={loadingRoom}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer text-xs"
                    >
                      {loadingRoom ? (
                        <span className="border-2 border-white/30 border-t-white rounded-full w-4 h-4 animate-spin" />
                      ) : (
                        <>Host Duel ({selectedDifficulty})</>
                      )}
                    </button>
                  </div>

                  {/* Separation */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                    </div>
                    <div className="relative flex justify-center text-[9px] uppercase font-black tracking-widest text-slate-400">
                      <span className="px-2 bg-slate-50 dark:bg-[#080d1a]">
                        Or Join Room
                      </span>
                    </div>
                  </div>

                  {/* Join Form */}
                  <form onSubmit={handleJoinMultiplayer} className="space-y-2.5">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={roomCodeToJoin}
                        onChange={(e) => setRoomCodeToJoin(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE"
                        className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-950/40 text-center font-bold tracking-widest text-slate-900 dark:text-white uppercase placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-bold transition-all text-xs cursor-pointer shadow-sm"
                      >
                        Join
                      </button>
                    </div>
                    {joinError && (
                      <p className="text-[10px] text-rose-500 font-medium text-center">{joinError}</p>
                    )}
                  </form>
                </div>
              </div>
            </section>

            {/* Watch Live Games Section */}
            <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-500">
                  <Eye className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">Watch Live Matches</h3>
                  <p className="text-xs text-slate-400">Spectate active games in real time</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeRooms.length === 0 ? (
                  <div className="col-span-2 py-6 text-center text-xs text-slate-400 font-semibold bg-slate-50 dark:bg-slate-900/10 border border-slate-200/10 rounded-xl">
                    No active multiplayer games right now.
                  </div>
                ) : (
                  activeRooms.map((roomItem: any) => {
                    const playerNames = Object.keys(roomItem.players || {});
                    return (
                      <div
                        key={roomItem.roomCode}
                        className="p-3 bg-white/40 dark:bg-slate-900/10 border border-slate-200/40 dark:border-slate-800/40 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 block">
                            Room #{roomItem.roomCode}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase mt-0.5">
                            {roomItem.difficulty} • {playerNames.length} Players
                          </span>
                          <span className="text-[9px] text-indigo-500 font-black block mt-0.5">
                            Status: {roomItem.state}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            if (synth) synth.playClick();
                            router.push(`/play/multi/${roomItem.roomCode}?spectate=true`);
                          }}
                          className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-md shadow-rose-500/10 active:scale-95 transition-all cursor-pointer"
                        >
                          Spectate
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </div>

        {/* RIGHT COLUMN: Tabbed Leaderboards & Friends Online */}
        <div>
          {/* Friends Online Sidebar Widget */}
          <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 flex flex-col mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Friends Online</h3>
                  <p className="text-[10px] text-slate-400">Duel active players</p>
                </div>
              </div>
              <button
                onClick={() => { if (synth) synth.playClick(); router.push("/friends"); }}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
              >
                Manage
              </button>
            </div>

            <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
              {friendsOnline.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-xs font-semibold">
                  No friends online right now.
                </div>
              ) : (
                friendsOnline.map((friend: any) => (
                  <div
                    key={friend.username}
                    className="flex items-center justify-between p-2 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-900/40 rounded-xl"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative">
                        <img
                          src={friend.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.username}`}
                          alt="Avatar"
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 object-contain p-0.5"
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white dark:border-slate-950" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                        {friend.username}
                      </span>
                    </div>

                    <button
                      onClick={() => handleChallengeDashboard(friend.username)}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black active:scale-95 transition-all cursor-pointer flex items-center gap-0.5"
                    >
                      <Swords className="w-3 h-3" /> Duel
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

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

                const remainingList = currentList.slice(3);

                return (
                  <div className="space-y-3">
                    {/* Top 3 Podium */}
                    <div className="flex items-end justify-center gap-3 my-6 pt-4 pb-2 border-b border-slate-200/40 dark:border-slate-800/40">
                      {/* 2nd Place */}
                      {currentList[1] && (
                        <div className="flex flex-col items-center min-w-0">
                          <div className="relative mb-2">
                            <img
                              src={currentList[1].avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentList[1].username}`}
                              alt="Silver Avatar"
                              className="w-11 h-11 rounded-full border-2 border-slate-300 dark:border-slate-400 bg-slate-100 dark:bg-slate-900 p-0.5 object-contain"
                            />
                            <span className="absolute -bottom-1 -right-1 bg-slate-300 dark:bg-slate-400 text-[9px] font-black text-slate-850 rounded-full w-4.5 h-4.5 flex items-center justify-center border border-white dark:border-slate-900 shadow">
                              2
                            </span>
                          </div>
                          <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 truncate max-w-[70px] block">
                            {currentList[1].username}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold block">{currentList[1].value}</span>
                          <div className="w-12 bg-slate-200 dark:bg-slate-800/70 h-8 rounded-t-lg mt-2 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-[10px]">
                            2nd
                          </div>
                        </div>
                      )}

                      {/* 1st Place */}
                      {currentList[0] && (
                        <div className="flex flex-col items-center min-w-0 -translate-y-1.5">
                          <div className="relative mb-2">
                            <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full blur opacity-30 animate-pulse" />
                            <img
                              src={currentList[0].avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentList[0].username}`}
                              alt="Gold Avatar"
                              className="w-14 h-14 rounded-full border-2 border-amber-400 bg-slate-100 dark:bg-slate-900 p-0.5 object-contain relative z-10"
                            />
                            <span className="absolute -bottom-1 -right-1 bg-amber-400 text-[10px] font-black text-slate-900 rounded-full w-5 h-5 flex items-center justify-center border border-white dark:border-slate-900 shadow-md z-20">
                              1
                            </span>
                          </div>
                          <span className="text-xs font-black text-slate-800 dark:text-white truncate max-w-[80px] block relative z-10">
                            👑 {currentList[0].username}
                          </span>
                          <span className="text-[9px] text-amber-500 font-extrabold block relative z-10">{currentList[0].value}</span>
                          <div className="w-14 bg-amber-400/20 dark:bg-amber-500/10 dark:border dark:border-amber-500/20 h-12 rounded-t-lg mt-2 flex items-center justify-center font-black text-amber-600 dark:text-amber-400 text-[10px] shadow-sm">
                            1st
                          </div>
                        </div>
                      )}

                      {/* 3rd Place */}
                      {currentList[2] && (
                        <div className="flex flex-col items-center min-w-0">
                          <div className="relative mb-2">
                            <img
                              src={currentList[2].avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentList[2].username}`}
                              alt="Bronze Avatar"
                              className="w-11 h-11 rounded-full border-2 border-amber-700/50 bg-slate-100 dark:bg-slate-900 p-0.5 object-contain"
                            />
                            <span className="absolute -bottom-1 -right-1 bg-amber-700/70 text-[9px] font-black text-white rounded-full w-4.5 h-4.5 flex items-center justify-center border border-white dark:border-slate-900 shadow">
                              3
                            </span>
                          </div>
                          <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 truncate max-w-[70px] block">
                            {currentList[2].username}
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold block">{currentList[2].value}</span>
                          <div className="w-12 bg-amber-700/10 dark:bg-amber-900/15 h-7 rounded-t-lg mt-2 flex items-center justify-center font-bold text-amber-700/80 dark:text-amber-500 text-[10px]">
                            3rd
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Remaining Ranks List */}
                    <div className="space-y-2">
                      {remainingList.map((player, idx) => (
                        <motion.div
                          layout
                          key={player.id || idx}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
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
                            <span className="text-[9px] font-black text-slate-400 w-5 text-center flex flex-col items-center">
                              <span>{idx + 4}</span>
                              <span className={idx % 2 === 0 ? "text-emerald-500 text-[7px]" : "text-rose-500 text-[7px]"}>
                                {idx % 2 === 0 ? "↑" : "↓"}
                              </span>
                            </span>
                            <img
                              src={player.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.username}`}
                              alt="Avatar"
                              className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 object-contain p-0.5 border border-slate-200/15"
                            />
                            <span className={`text-xs font-bold ${player.isSelf ? "text-indigo-600 dark:text-indigo-400" : "text-slate-700 dark:text-slate-300"}`}>
                              {player.username}
                            </span>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                              {player.value}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
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
