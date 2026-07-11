"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, UserPlus, UserMinus, Search, Clock, Trophy, Swords, X, Check, Eye, HelpCircle, Activity } from "lucide-react";
import { apiFetch, getStoredUser } from "@/utils/api";
import { Client } from "@stomp/stompjs";
import { synth } from "@/utils/synth";

interface Friend {
  id: number;
  username: string;
  avatarUrl: string;
  online: boolean;
  gamesPlayed: number;
  gamesWon: number;
  fastestSolveTimeSeconds: number | null;
}

interface PendingRequest {
  requestId: number;
  senderUsername: string;
  senderAvatarUrl: string;
}

interface SearchResult {
  username: string;
  avatarUrl: string;
  relationStatus: "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED";
}

export default function FriendsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [challengingFriend, setChallengingFriend] = useState<string | null>(null);
  const [selectedFriendPreview, setSelectedFriendPreview] = useState<Friend | null>(null);
  const [error, setError] = useState("");

  const stompClient = useRef<Client | null>(null);
  const isConnected = useRef(false);

  // Initialize data and stomp client
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(stored);

    // Fetch initial friends & requests
    const loadFriendsData = async () => {
      try {
        setLoading(true);
        const activeFriends = await apiFetch("/api/friends");
        setFriends(activeFriends);

        const pending = await apiFetch("/api/friends/requests/pending");
        setPendingRequests(pending);
      } catch (err) {
        console.error("Error fetching friends data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadFriendsData();

    // Setup active WebSocket for sending challenge duels
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

    // Ping profile online status every 20s
    const pingInterval = setInterval(async () => {
      try {
        await apiFetch("/api/profile/ping", { method: "POST" });
      } catch (e) {}
    }, 20000);

    return () => {
      if (client.active) client.deactivate();
      clearInterval(pingInterval);
    };
  }, [router]);

  // Refresh lists helper
  const refreshFriendsList = async () => {
    try {
      const activeFriends = await apiFetch("/api/friends");
      setFriends(activeFriends);

      const pending = await apiFetch("/api/friends/requests/pending");
      setPendingRequests(pending);
    } catch (e) {
      console.error(e);
    }
  };

  // Search trigger
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const triggerSearch = setTimeout(async () => {
      try {
        setSearching(true);
        const results = await apiFetch(`/api/friends/search?query=${searchQuery}`);
        setSearchResults(results);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(triggerSearch);
  }, [searchQuery]);

  const handleSendRequest = async (username: string) => {
    if (synth) synth.playClick();
    try {
      await apiFetch(`/api/friends/request?username=${username}`, { method: "POST" });
      // Update local search result state
      setSearchResults(prev =>
        prev.map(r => r.username === username ? { ...r, relationStatus: "PENDING_SENT" } : r)
      );
      if (synth) synth.playSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to send request.");
    }
  };

  const handleRespondRequest = async (requestId: number, action: "ACCEPT" | "REJECT") => {
    if (synth) synth.playClick();
    try {
      await apiFetch(`/api/friends/respond?requestId=${requestId}&action=${action}`, { method: "POST" });
      setPendingRequests(prev => prev.filter(r => r.requestId !== requestId));
      refreshFriendsList();
      if (synth) synth.playSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to respond to request.");
    }
  };

  const handleRemoveFriend = async (username: string) => {
    if (synth) synth.playClick();
    if (!confirm(`Are you sure you want to remove ${username}?`)) return;

    try {
      await apiFetch(`/api/friends/${username}`, { method: "DELETE" });
      setFriends(prev => prev.filter(f => f.username !== username));
      if (synth) synth.playSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to remove friend.");
    }
  };

  const handleChallenge = async (friend: Friend) => {
    if (!stompClient.current || !isConnected.current) {
      alert("WebSocket connection is not ready yet. Please wait a moment.");
      return;
    }

    setChallengingFriend(friend.username);
    if (synth) synth.playClick();

    try {
      // 1. Create a multiplayer room
      const room = await apiFetch("/api/rooms/create?difficulty=Medium", { method: "POST" });
      
      // 2. Broadcast Duel Challenge Event via WS
      stompClient.current.publish({
        destination: "/app/friends/challenge",
        body: JSON.stringify({
          senderUsername: user.username,
          recipientUsername: friend.username,
          roomCode: room.roomCode,
          difficulty: "Medium"
        })
      });

      // 3. Route host to the lobby immediately
      router.push(`/play/multi/${room.roomCode}`);
    } catch (err: any) {
      setError(err.message || "Failed to initiate challenge duel.");
      setChallengingFriend(null);
    }
  };

  const formatTime = (secs: number | null) => {
    if (secs === null || secs === undefined) return "--";
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#080d1a] min-h-screen">
        <span className="border-4 border-indigo-200 border-t-indigo-600 rounded-full w-12 h-12 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Syncing Friends List...</h2>
      </div>
    );
  }

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
              router.push("/dashboard");
            }}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <span className="text-xs uppercase font-extrabold tracking-widest text-slate-400">Social Club</span>
        </header>

        <div className="text-center sm:text-left mb-8">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
            Arena Friends
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Search players, manage friend requests, and challenge online friends to real-time Sudoku Duels.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* LEFT 2 COLUMNS: Friends List & Search */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Friends list panel */}
            <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40">
              <h3 className="font-extrabold text-lg mb-4 flex items-center justify-between">
                Active Friends
                <span className="text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full font-black">
                  {friends.length}
                </span>
              </h3>

              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {friends.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center">
                    <svg className="w-16 h-16 text-indigo-500/20 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="font-semibold text-slate-500 dark:text-slate-400">No Active Friends</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] leading-relaxed">Search below to connect with other Sudoku competitors.</p>
                  </div>
                ) : (
                  friends.map((friend) => (
                    <motion.div
                      layout
                      key={friend.id}
                      className="flex items-center justify-between p-3.5 bg-white/40 dark:bg-slate-900/10 border border-slate-200/40 dark:border-slate-800/40 rounded-xl hover:border-indigo-500/30 transition-all duration-200"
                    >
                      <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => setSelectedFriendPreview(friend)}
                      >
                        <div className="relative">
                          <img
                            src={friend.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${friend.username}`}
                            alt="Avatar"
                            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 object-contain p-0.5 border border-slate-200/20 group-hover:scale-105 transition-transform"
                          />
                          <span
                            className={`
                              absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-950
                              ${friend.online ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}
                            `}
                          />
                        </div>
                        <div>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block group-hover:text-indigo-500 transition-colors">
                            {friend.username}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
                            {friend.online ? (friend.gamesPlayed % 2 === 0 ? "⚡ Solving Puzzle" : "💤 Idle in Lobby") : "Offline"}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedFriendPreview(friend)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all cursor-pointer"
                          title="View Profile Stats"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {friend.online && (
                          <button
                            disabled={challengingFriend !== null}
                            onClick={() => handleChallenge(friend)}
                            className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold active:scale-95 transition-all cursor-pointer"
                            title="Challenge Duel"
                          >
                            <Swords className="w-3.5 h-3.5 animate-bounce" />
                            {challengingFriend === friend.username ? "Loading..." : "Duel"}
                          </button>
                        )}

                        <button
                          onClick={() => handleRemoveFriend(friend.username)}
                          className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 transition-all cursor-pointer"
                          title="Remove Friend"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </section>
            
            {/* Search users panel */}
            <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40">
              <h3 className="font-extrabold text-lg mb-4">Find Sudokers</h3>
              
              <div className="relative mb-4">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter username to search..."
                  className="w-full pl-9 pr-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-950/40 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold"
                />
              </div>

              {/* Search Results */}
              <div className="space-y-2">
                {searching ? (
                  <div className="text-center py-4 text-slate-400 text-xs">
                    Searching...
                  </div>
                ) : searchQuery && searchResults.length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs">
                    No players found matching your query.
                  </div>
                ) : (
                  searchResults.map((result) => (
                    <div
                      key={result.username}
                      className="flex items-center justify-between p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/40 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={result.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${result.username}`}
                          alt="Avatar"
                          className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 object-contain p-0.5 border border-slate-200/10"
                        />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {result.username}
                        </span>
                      </div>

                      {/* Relation Status Button */}
                      <div>
                        {result.relationStatus === "NONE" && (
                          <button
                            onClick={() => handleSendRequest(result.username)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer animate-pulse"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Add Friend
                          </button>
                        )}
                        {result.relationStatus === "PENDING_SENT" && (
                          <span className="text-xs bg-slate-100 dark:bg-slate-900 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-200/10 font-bold">
                            Request Sent
                          </span>
                        )}
                        {result.relationStatus === "PENDING_RECEIVED" && (
                          <span className="text-xs bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 px-3 py-1.5 rounded-lg border border-indigo-200/10 font-bold">
                            Pending Approval
                          </span>
                        )}
                        {result.relationStatus === "ACCEPTED" && (
                          <span className="text-xs bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-200/10 font-bold">
                            Friends
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

          </div>

          {/* RIGHT COLUMN: Received Requests & Quick Invites */}
          <div className="space-y-6">
            
            {/* Pending Requests Received */}
            <section className="glass-panel rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40">
              <h3 className="font-extrabold text-lg mb-4 flex items-center justify-between">
                Friend Invites
                <span className="text-xs bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-black">
                  {pendingRequests.length}
                </span>
              </h3>

              <div className="space-y-3">
                {pendingRequests.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                    <svg className="w-10 h-10 text-purple-500/20 mb-2 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-bold text-slate-500">Inbox Clear</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">No pending friend requests.</p>
                  </div>
                ) : (
                  pendingRequests.map((req) => (
                    <div
                      key={req.requestId}
                      className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-900/40 rounded-xl text-center"
                    >
                      <img
                        src={req.senderAvatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.senderUsername}`}
                        alt="Avatar"
                        className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 object-contain p-0.5 mx-auto mb-2 border border-slate-200/10"
                      />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-3">
                        {req.senderUsername}
                      </span>
                      
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleRespondRequest(req.requestId, "REJECT")}
                          className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer transition-colors"
                          title="Decline invite"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRespondRequest(req.requestId, "ACCEPT")}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Accept
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
            
          </div>

        </div>

      </div>

      {/* Friend Detail Profile Preview Modal */}
      <AnimatePresence>
        {selectedFriendPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel max-w-sm w-full rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 text-center shadow-2xl relative"
            >
              <button
                onClick={() => { if (synth) synth.playClick(); setSelectedFriendPreview(null); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="42" className="text-slate-100 dark:text-slate-900" strokeWidth="4" fill="transparent" stroke="currentColor" />
                  <circle cx="48" cy="48" r="42" className="text-indigo-500" strokeWidth="4" fill="transparent" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - ((selectedFriendPreview.gamesWon * 25) % 100) / 100)} stroke="currentColor" strokeLinecap="round" />
                </svg>
                <img
                  src={selectedFriendPreview.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${selectedFriendPreview.username}`}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 object-contain p-0.5 relative z-10"
                />
              </div>

              <h4 className="font-extrabold text-xl text-slate-900 dark:text-white">
                {selectedFriendPreview.username}
              </h4>
              <span className={`text-[10px] font-black uppercase tracking-wider ${selectedFriendPreview.online ? "text-emerald-500" : "text-slate-400"}`}>
                {selectedFriendPreview.online ? "Online Now" : "Offline"}
              </span>

              {/* Stats Block */}
              <div className="grid grid-cols-2 gap-3 my-6 text-left">
                <div className="bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/10">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                    Games Played
                  </span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {selectedFriendPreview.gamesPlayed}
                  </span>
                </div>

                <div className="bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/10">
                  <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                    Matches Won
                  </span>
                  <span className="text-base font-extrabold text-slate-900 dark:text-white">
                    {selectedFriendPreview.gamesWon}
                  </span>
                </div>

                <div className="col-span-2 bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200/10 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                      Best Solve Time
                    </span>
                    <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                      {formatTime(selectedFriendPreview.fastestSolveTimeSeconds)}
                    </span>
                  </div>
                  <Clock className="w-5 h-5 text-indigo-500" />
                </div>
              </div>

              <button
                onClick={() => { if (synth) synth.playClick(); setSelectedFriendPreview(null); }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs border border-slate-200/20 cursor-pointer"
              >
                Close Preview
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
