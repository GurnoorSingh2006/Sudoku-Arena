"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Client } from "@stomp/stompjs";
import { Trophy, Clock, XCircle, Home, Users, Copy, Check, ArrowLeft, Swords } from "lucide-react";
import { getStoredUser } from "@/utils/api";
import { useSudoku } from "@/hooks/useSudoku";
import SudokuBoard from "@/components/SudokuBoard";
import NumberPad from "@/components/NumberPad";
import GameControls from "@/components/GameControls";
import { synth } from "@/utils/synth";

interface RoomPlayer {
  username: string;
  avatarUrl: string;
  completionPercentage: number;
  completedCells: number;
  mistakes: number;
  finished: boolean;
  solveTimeSeconds: number;
}

interface Room {
  roomCode: string;
  difficulty: string;
  board: number[][];
  solution: number[][];
  state: string; // "WAITING", "COUNTDOWN", "PLAYING", "FINISHED"
  players: Record<string, RoomPlayer>;
  winnerUsername: string | null;
  startTimestamp: number;
}

export default function MultiplayerGamePage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.roomCode as string).toUpperCase();

  const [user, setUser] = useState<any>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const stompClient = useRef<Client | null>(null);
  const isConnected = useRef(false);

  // Load user profile
  useEffect(() => {
    const stored = getStoredUser();
    if (!stored) {
      router.push("/login");
      return;
    }
    setUser(stored);
  }, [router]);

  // Connect to STOMP WebSockets server
  useEffect(() => {
    if (!user) return;

    const wsHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://${wsHost}:8080/ws`;
    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      isConnected.current = true;
      stompClient.current = client;

      // Subscribe to room updates channel
      client.subscribe(`/topic/room/${roomCode}`, (message) => {
        const updatedRoom = JSON.parse(message.body) as Room;
        setRoom(updatedRoom);
      });

      // Join room payload broadcast
      client.publish({
        destination: "/app/room/join",
        body: JSON.stringify({
          roomCode,
          username: user.username,
          avatarUrl: user.avatarUrl,
        }),
      });
    };

    client.onDisconnect = () => {
      isConnected.current = false;
      stompClient.current = null;
    };

    client.onStompError = (frame) => {
      console.error("STOMP protocol error:", frame.body);
    };

    client.activate();

    // Clean up connections on exit
    return () => {
      if (client.active) {
        // Report exit to opponent
        client.publish({
          destination: "/app/room/leave",
          body: JSON.stringify({ roomCode, username: user.username }),
        });
        client.deactivate();
      }
    };
  }, [roomCode, user]);

  // Handle countdown triggers
  useEffect(() => {
    if (!room || room.state !== "COUNTDOWN" || !room.startTimestamp) {
      setCountdown(null);
      return;
    }

    const checkCountdown = () => {
      const remaining = Math.max(0, Math.ceil((room.startTimestamp - Date.now()) / 1000));
      setCountdown(remaining);

      if (remaining > 0) {
        if (synth) synth.playBeep();
      }

      if (remaining === 0 && stompClient.current) {
        // Countdown finished, report to backend
        stompClient.current.publish({
          destination: "/app/room/start",
          body: JSON.stringify({ roomCode }),
        });
      }
    };

    checkCountdown();
    const interval = setInterval(checkCountdown, 1000);
    return () => clearInterval(interval);
  }, [room, roomCode]);

  // Hook into gameplay board states
  const initialGrid = room?.board || [];
  const solutionGrid = room?.solution || [];
  const difficulty = room?.difficulty || "Medium";

  const {
    board,
    notes,
    selectedCell,
    selectedNumber,
    noteMode,
    mistakeCount,
    timerSeconds,
    isCompleted,
    selectCell,
    selectNumber,
    enterNumber,
    clearCell,
    undo,
    redo,
    toggleNoteMode,
    numberCounts,
    hasUndo,
    hasRedo,
  } = useSudoku(
    initialGrid,
    solutionGrid,
    difficulty,
    // On cell progress: publish updates via WebSocket
    (completed, mistakes) => {
      if (stompClient.current && room?.state === "PLAYING") {
        stompClient.current.publish({
          destination: "/app/room/progress",
          body: JSON.stringify({
            roomCode,
            username: user.username,
            completedCells: completed,
            mistakes,
          }),
        });
      }
    },
    // On complete: publish finished trigger
    (time, mistakes) => {
      if (stompClient.current && room?.state === "PLAYING") {
        stompClient.current.publish({
          destination: "/app/room/finish",
          body: JSON.stringify({
            roomCode,
            username: user.username,
            solveTimeSeconds: time,
            mistakes,
          }),
        });
      }
    }
  );

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const inviteLink = `${window.location.origin}/play/multi/${roomCode}`;
      navigator.clipboard.writeText(inviteLink).then(() => {
        setCopied(true);
        if (synth) synth.playChime();
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleReturnToDashboard = () => {
    if (synth) synth.playClick();
    router.push("/dashboard");
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (!user || !room) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#080d1a]">
        <span className="border-4 border-indigo-200 border-t-indigo-600 rounded-full w-12 h-12 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Connecting to Lobby...</h2>
        <p className="text-slate-400 text-sm mt-1">Spinning up WebSockets</p>
      </div>
    );
  }

  // Get opponent info
  const players = Object.values(room.players);
  const me = room.players[user.username] || {
    completionPercentage: 0,
    mistakes: 0,
    completedCells: 0,
    finished: false,
    solveTimeSeconds: 0,
  };
  const opponent = players.find((p) => p.username !== user.username);

  // VIEW 1: WAITING LOBBY
  if (room.state === "WAITING") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#080d1a] py-12 px-4 text-center">
        <header className="absolute top-6 left-6">
          <button
            onClick={handleReturnToDashboard}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </header>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel max-w-md w-full rounded-2xl p-8 border border-slate-200/50 dark:border-slate-800/40 shadow-2xl relative"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mx-auto mb-6 border border-indigo-200/10">
            <Users className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            MULTIPLAYER LOBBY
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Invite a friend to solve the same board in real-time
          </p>

          {/* Invitation code section */}
          <div className="my-8 p-4 bg-slate-100 dark:bg-slate-900/40 rounded-2xl border border-slate-200/30">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-1">
              Room Code
            </span>
            <span className="text-3xl font-black tracking-widest text-indigo-600 dark:text-indigo-400">
              {roomCode}
            </span>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Copied Invite Link
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy Invite Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Players in room status */}
          <div className="space-y-3 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Players Joined ({players.length}/2)
            </h4>

            {players.map((p) => (
              <div key={p.username} className="flex items-center gap-3 p-3 bg-white/40 dark:bg-slate-950/20 border border-slate-200/30 rounded-xl">
                <img
                  src={p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`}
                  alt="Avatar"
                  className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 object-contain p-0.5"
                />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {p.username} {p.username === user.username && "(You)"}
                </span>
              </div>
            ))}

            {players.length < 2 && (
              <div className="flex items-center gap-3 p-3 bg-dashed border-2 border-slate-200 dark:border-slate-800 rounded-xl opacity-60">
                <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  ?
                </div>
                <span className="text-sm text-slate-400 animate-pulse">
                  Waiting for opponent...
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // VIEW 2: COUNTDOWN TIMER OVERLAY
  if (room.state === "COUNTDOWN") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#080d1a]">
        <div className="text-center">
          <span className="text-[11px] text-slate-400 uppercase font-extrabold tracking-widest block mb-4">
            Get Ready
          </span>
          <motion.div
            key={countdown}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-8xl sm:text-9xl font-black text-indigo-600 dark:text-indigo-400"
          >
            {countdown}
          </motion.div>
          <span className="text-sm text-slate-500 dark:text-slate-400 block mt-6">
            Match is starting simultaneously...
          </span>
        </div>
      </div>
    );
  }

  // VIEW 3: MATCH PLAYING OR COMPLETED RESULTS
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50 dark:bg-[#080d1a] py-6 px-4 relative overflow-hidden transition-all duration-300">
      
      {/* Top match header */}
      <header className="max-w-[480px] w-full mx-auto flex items-center justify-between mb-4">
        <button
          onClick={handleReturnToDashboard}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-rose-500 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Leave Match
        </button>

        <span className="text-xs px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-extrabold border border-indigo-100/20">
          Difficulty: {room.difficulty}
        </span>
      </header>

      {/* Real-time Multiplayer Progress Panels */}
      <section className="max-w-[460px] w-full mx-auto grid grid-cols-2 gap-4 py-4 px-4 mb-4 rounded-2xl glass-panel border border-slate-200/50 dark:border-slate-800/40 text-xs">
        
        {/* Your stats */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <img
              src={user.avatarUrl}
              alt="Avatar"
              className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 object-contain p-0.5"
            />
            <div className="min-w-0">
              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">You</span>
              <span className="text-[10px] text-slate-400 block truncate">Mistakes: {me.mistakes}</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between font-bold text-slate-600 dark:text-slate-400">
            <span>Progress</span>
            <span>{me.completionPercentage}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${me.completionPercentage}%` }} />
          </div>
        </div>

        {/* Opponent stats */}
        {opponent ? (
          <div className="space-y-2 border-l border-slate-200/50 dark:border-slate-800/40 pl-4">
            <div className="flex items-center gap-2">
              <img
                src={opponent.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${opponent.username}`}
                alt="Avatar"
                className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 object-contain p-0.5"
              />
              <div className="min-w-0">
                <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{opponent.username}</span>
                <span className="text-[10px] text-slate-400 block truncate">Mistakes: {opponent.mistakes}</span>
              </div>
            </div>

            <div className="flex items-center justify-between font-bold text-slate-600 dark:text-slate-400">
              <span>Progress</span>
              <span>{opponent.completionPercentage}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-purple-600 h-full transition-all duration-300" style={{ width: `${opponent.completionPercentage}%` }} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-slate-400 text-center font-bold">
            Opponent Disconnected
          </div>
        )}
      </section>

      {/* Main Grid Game screen */}
      <main className="flex-1 flex flex-col justify-center">
        <SudokuBoard
          board={board}
          notes={notes}
          initialBoard={initialGrid}
          solutionBoard={solutionGrid}
          selectedCell={selectedCell}
          selectedNumber={selectedNumber}
          onSelectCell={selectCell}
          onEnterNumber={enterNumber}
          onClearCell={clearCell}
          isPaused={false} // Disable pause in multiplayer
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
          onHint={() => {}} // Disable hints in multiplayer for fairness
          isPaused={false}
          isCompleted={isCompleted}
        />

        {/* Numpad */}
        <NumberPad
          numberCounts={numberCounts}
          selectedNumber={selectedNumber}
          onSelectNumber={selectNumber}
          isPaused={false}
          isCompleted={isCompleted}
        />

        <div className="text-center text-xs text-slate-400 mt-4 flex items-center justify-center gap-1.5 font-semibold">
          <Clock className="w-3.5 h-3.5" /> Live Solve Timer: {formatTime(timerSeconds)}
        </div>
      </main>

      {/* Multiplayer End-Game Results Modal */}
      <AnimatePresence>
        {room.state === "FINISHED" && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-panel max-w-md w-full rounded-2xl p-6 border border-slate-200/50 dark:border-slate-800/40 text-center shadow-2xl"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center mx-auto mb-4 border border-indigo-200/10 animate-pulse">
                <Swords className="w-7 h-7" />
              </div>

              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase">
                {room.winnerUsername === user.username ? "VICTORY!" : "DEFEAT"}
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                {room.winnerUsername === user.username
                  ? "You solved the grid first!"
                  : `${room.winnerUsername} solved the grid first!`}
              </p>

              {/* Side-by-side Scoreboard comparisons */}
              <div className="my-6 space-y-3">
                {players.map((p) => {
                  const isUserWinner = room.winnerUsername === p.username;
                  return (
                    <div
                      key={p.username}
                      className={`
                        flex items-center justify-between p-3.5 rounded-xl border
                        ${
                          isUserWinner
                            ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-500/30"
                            : "bg-slate-100 dark:bg-slate-900/40 border-slate-200/30"
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={p.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${p.username}`}
                          alt="Avatar"
                          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 object-contain p-0.5"
                        />
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {p.username} {p.username === user.username && "(You)"}
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white block">
                          {p.finished ? formatTime(p.solveTimeSeconds) : `${p.completionPercentage}% filled`}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-bold uppercase">
                          Mistakes: {p.mistakes}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleReturnToDashboard}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
