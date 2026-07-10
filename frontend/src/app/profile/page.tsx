"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Edit2, Check, User as UserIcon, Calendar, Trophy, Award, Clock, Star, Activity } from "lucide-react";
import { apiFetch, getStoredUser, setStoredUser } from "@/utils/api";
import { synth } from "@/utils/synth";

const AVATAR_PRESETS = [
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robot1",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robot2",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Gurnoor",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Arena",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Sudoku",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Play",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Master",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Pro"
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/login");
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        // Fetch fresh profile
        const freshProfile = await apiFetch("/api/profile");
        setUser(freshProfile);
        setStoredUser({ ...stored, ...freshProfile });
        setNewUsername(freshProfile.username);
        setSelectedAvatar(freshProfile.avatarUrl);

        // Fetch detailed stats
        const freshStats = await apiFetch("/api/profile/stats");
        setStats(freshStats);
      } catch (err) {
        console.error("Failed to load profile details:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleUpdateProfile = async (updates: { username?: string; avatarUrl?: string }) => {
    setError("");
    setSaving(true);
    if (synth) synth.playClick();

    try {
      const updatedUser = await apiFetch("/api/profile", {
        method: "PUT",
        body: JSON.stringify(updates),
      });

      setUser(updatedUser);
      const stored = getStoredUser();
      setStoredUser({ ...stored, ...updatedUser });
      
      if (synth) synth.playSuccess();
      setEditingName(false);
      setShowAvatarSelector(false);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
      if (synth) synth.playMistake();
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (secs: number | null) => {
    if (secs === null || secs === undefined) return "--";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "--";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  };

  if (loading || !user || !stats) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#080d1a] min-h-screen">
        <span className="border-4 border-indigo-200 border-t-indigo-600 rounded-full w-12 h-12 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Loading Profile Details...</h2>
      </div>
    );
  }

  // Derived metrics
  const winRatio = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const avgSolveTime = stats.gamesWon > 0 ? Math.round(stats.totalSolveTimeSeconds / stats.gamesWon) : 0;

  const difficultyCards = [
    { name: "Easy", solved: stats.easyPuzzlesSolved, best: stats.bestTimeEasy, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/20" },
    { name: "Medium", solved: stats.mediumPuzzlesSolved, best: stats.bestTimeMedium, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30 border-blue-200/20" },
    { name: "Hard", solved: stats.hardPuzzlesSolved, best: stats.bestTimeHard, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30 border-amber-200/20" },
    { name: "Expert", solved: stats.expertPuzzlesSolved, best: stats.bestTimeExpert, color: "text-rose-500 bg-rose-50 dark:bg-rose-950/30 border-rose-200/20" },
    { name: "Daily", solved: stats.dailyChallengesSolved, best: stats.bestTimeDaily, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/30 border-purple-200/20" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080d1a] py-8 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-200">
      
      {/* Background glow effects */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-400/10 dark:bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-400/10 dark:bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto z-10 relative">
        
        {/* Header Navigation */}
        <header className="flex items-center justify-between mb-8">
          <button
            onClick={() => {
              if (synth) synth.playClick();
              router.push("/dashboard");
            }}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">Player Card</span>
        </header>

        {/* Main Profile Info Card */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-200/50 dark:border-slate-800/40 shadow-xl mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
            
            {/* Avatar block with selection trigger */}
            <div className="relative group">
              <img
                src={user.avatarUrl}
                alt="Avatar"
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 object-contain p-1 border border-indigo-200/20 cursor-pointer shadow-md group-hover:scale-105 transition-transform duration-200"
                onClick={() => setShowAvatarSelector(true)}
              />
              <button
                onClick={() => setShowAvatarSelector(true)}
                className="absolute bottom-1 right-1 p-1.5 rounded-lg bg-indigo-600 text-white border border-indigo-500 shadow hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer"
                title="Choose Avatar"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {editingName ? (
                  <div className="flex items-center gap-2 w-full max-w-sm justify-center sm:justify-start">
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 font-bold outline-none text-base shadow-sm focus:border-indigo-500"
                    />
                    <button
                      disabled={saving}
                      onClick={() => handleUpdateProfile({ username: newUsername })}
                      className="p-2 rounded-xl bg-indigo-600 text-white shadow hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-800 dark:text-white flex items-center gap-2 truncate justify-center sm:justify-start">
                    {user.username}
                    <button
                      onClick={() => setEditingName(true)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </h2>
                )}
              </div>

              <p className="text-sm text-slate-400 mt-1">{user.email}</p>

              {error && <p className="text-xs text-rose-500 font-bold mt-2">{error}</p>}

              <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-xs text-slate-500 dark:text-slate-400 justify-center sm:justify-start">
                <span className="flex items-center gap-1.5 font-semibold">
                  <UserIcon className="w-4 h-4 text-indigo-500" /> ID: #{user.id}
                </span>
                <span className="flex items-center gap-1.5 font-semibold">
                  <Calendar className="w-4 h-4 text-indigo-500" /> Joined: {formatDate(user.createdAt)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Avatar Selection Dialog */}
        <AnimatePresence>
          {showAvatarSelector && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-panel max-w-md w-full rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 text-center shadow-2xl"
              >
                <h3 className="font-extrabold text-lg mb-2">Select Avatar</h3>
                <p className="text-xs text-slate-400 mb-6">Choose your robot mascot preset</p>

                <div className="grid grid-cols-4 gap-3 mb-6">
                  {AVATAR_PRESETS.map((avatar) => (
                    <img
                      key={avatar}
                      src={avatar}
                      alt="Avatar Preset"
                      className={`
                        w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-900 border p-1 object-contain cursor-pointer transition-all duration-200
                        ${selectedAvatar === avatar ? "border-indigo-600 scale-105 shadow-md shadow-indigo-500/10" : "border-slate-200/50 dark:border-slate-800/50 hover:border-indigo-400"}
                      `}
                      onClick={() => setSelectedAvatar(avatar)}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAvatarSelector(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => handleUpdateProfile({ avatarUrl: selectedAvatar })}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md active:scale-95 transition-all text-xs cursor-pointer"
                  >
                    Save Avatar
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Key Metrics cards grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="glass-panel p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Played</span>
              <span className="text-base font-extrabold text-slate-800 dark:text-white">{stats.gamesPlayed}</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Won</span>
              <span className="text-base font-extrabold text-slate-800 dark:text-white">{stats.gamesWon}</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Win Ratio</span>
              <span className="text-base font-extrabold text-slate-800 dark:text-white">{winRatio}%</span>
            </div>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/40 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Avg Time</span>
              <span className="text-base font-extrabold text-slate-800 dark:text-white">{formatTime(avgSolveTime)}</span>
            </div>
          </div>
        </section>

        {/* Difficulty Wise Statistics */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-indigo-500" />
            <h3 className="font-extrabold text-lg">Difficulty breakdown</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {difficultyCards.map((card) => (
              <div
                key={card.name}
                className="glass-panel rounded-2xl p-5 border border-slate-200/50 dark:border-slate-800/40 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-black text-sm uppercase tracking-wide text-slate-700 dark:text-slate-200">
                    {card.name}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${card.color}`}>
                    {card.solved} Solved
                  </span>
                </div>

                <div className="bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/20 p-3 rounded-xl">
                  <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Best solved time</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white mt-0.5 block">
                    {formatTime(card.best)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
