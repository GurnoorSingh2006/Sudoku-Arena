"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Lock, CheckCircle, ShieldAlert } from "lucide-react";
import { apiFetch, getStoredUser, setStoredUser } from "@/utils/api";
import { synth } from "@/utils/synth";

interface Avatar {
  id: string;
  name: string;
  url: string;
  category: string;
  unlockCondition: string;
  unlocked: boolean;
  equipped: boolean;
}

export default function AvatarsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(stored);

    const fetchAvatars = async () => {
      try {
        setLoading(true);
        const data = await apiFetch("/api/avatars");
        setAvatars(data);
      } catch (err: any) {
        console.error("Failed to load avatars:", err);
        setError("Failed to load avatars list.");
      } finally {
        setLoading(false);
      }
    };

    fetchAvatars();
  }, [router]);

  const handleEquip = async (avatarId: string) => {
    setError("");
    setEquippingId(avatarId);
    if (synth) synth.playClick();

    try {
      const updatedUser = await apiFetch(`/api/avatars/equip?avatarId=${avatarId}`, {
        method: "POST",
      });

      setUser(updatedUser);
      const stored = getStoredUser();
      setStoredUser({ ...stored, ...updatedUser });

      // Refresh list to update equipped state
      const freshAvatars = await apiFetch("/api/avatars");
      setAvatars(freshAvatars);

      if (synth) synth.playSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to equip avatar.");
      if (synth) synth.playMistake();
    } finally {
      setEquippingId(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#080d1a] min-h-screen">
        <span className="border-4 border-indigo-200 border-t-indigo-600 rounded-full w-12 h-12 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Loading Avatar Registry...</h2>
      </div>
    );
  }

  // Group names
  const categories = ["All", "Robots", "Chess", "Animals", "Fantasy", "Special"];
  const filteredAvatars = activeCategory === "All"
    ? avatars
    : avatars.filter((a) => a.category.toLowerCase() === activeCategory.toLowerCase());

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080d1a] py-8 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-200 relative overflow-hidden">
      
      {/* Background blobs */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-indigo-400/10 dark:bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-400/10 dark:bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto z-10 relative">
        
        {/* Header navigation */}
        <header className="flex items-center justify-between mb-8">
          <button
            onClick={() => {
              if (synth) synth.playClick();
              router.push("/profile");
            }}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Profile
          </button>
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">Unlock Achievements</span>
        </header>

        <div className="text-center sm:text-left mb-8">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Avatar Wardrobe
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Complete milestones in the Arena to unlock custom avatars and chess icons.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200/60 dark:border-slate-800/40 pb-4 justify-center sm:justify-start">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                if (synth) synth.playClick();
                setActiveCategory(cat);
              }}
              className={`
                px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border
                ${
                  activeCategory === cat
                    ? "bg-indigo-600 text-white border-indigo-600 shadow shadow-indigo-500/20"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Avatars Grid */}
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredAvatars.map((avatar) => (
              <motion.div
                layout
                key={avatar.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`
                  glass-panel rounded-3xl p-5 border flex flex-col items-center justify-between text-center relative overflow-hidden transition-all duration-300 shadow-premium hover:shadow-xl hover:-translate-y-1 group
                  ${
                    avatar.equipped
                      ? "border-indigo-500 ring-2 ring-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-950/20"
                      : avatar.unlocked
                      ? "border-slate-200/50 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/10 hover:border-indigo-500/30"
                      : "border-slate-200/30 dark:border-slate-900/10 bg-slate-100/50 dark:bg-slate-950/10 opacity-70"
                  }
                `}
              >
                {/* Avatar Icon */}
                <div className="relative mb-3">
                  <img
                    src={avatar.url}
                    alt={avatar.name}
                    className={`
                      w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 object-contain p-1 border border-indigo-200/10 transition-transform duration-300 group-hover:scale-105
                      ${!avatar.unlocked ? "filter grayscale opacity-45 blur-[0.5px]" : ""}
                    `}
                  />
                  {!avatar.unlocked && (
                    <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[0.5px] rounded-2xl flex items-center justify-center text-white">
                      <Lock className="w-4 h-4 text-slate-200" />
                    </div>
                  )}
                </div>

                {/* Name */}
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
                    {avatar.name}
                  </h4>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 block w-max mx-auto mt-1 font-bold uppercase tracking-wider">
                    {avatar.category}
                  </span>
                </div>

                {/* Unlock condition details */}
                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium my-3 leading-tight px-1 min-h-[30px] flex items-center justify-center">
                  {avatar.unlockCondition}
                </div>

                {/* Equip Action Button */}
                <div className="w-full">
                  {avatar.equipped ? (
                    <div className="flex items-center justify-center gap-1 text-xs font-bold py-2 text-indigo-500">
                      <CheckCircle className="w-4 h-4" /> Equipped
                    </div>
                  ) : avatar.unlocked ? (
                    <button
                      disabled={equippingId !== null}
                      onClick={() => handleEquip(avatar.id)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-indigo-500/10"
                    >
                      Equip
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2 bg-slate-200 dark:bg-slate-850 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed border border-slate-200/50 dark:border-slate-800/10"
                    >
                      Locked
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredAvatars.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No avatars found in this category.
          </div>
        )}
      </div>
    </div>
  );
}
