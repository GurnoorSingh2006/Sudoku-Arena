"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Client } from "@stomp/stompjs";
import { Swords, X, Check } from "lucide-react";
import { getStoredUser } from "@/utils/api";
import { synth } from "@/utils/synth";

interface ChallengeNotification {
  senderUsername: string;
  recipientUsername: string;
  roomCode: string;
  difficulty: string;
}

export default function NotificationsHandler() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeChallenge, setActiveChallenge] = useState<ChallengeNotification | null>(null);
  const stompClient = useRef<Client | null>(null);
  const isConnected = useRef(false);

  useEffect(() => {
    // Check if user is logged in
    const stored = getStoredUser();
    if (!stored) return;
    setUser(stored);

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

      // Subscribe to user-specific private notifications topic
      client.subscribe(`/topic/user/${stored.username}/notifications`, (message) => {
        try {
          const payload = JSON.parse(message.body) as ChallengeNotification;
          if (synth) synth.playSuccess();
          setActiveChallenge(payload);
        } catch (err) {
          console.error("Error parsing challenge notification:", err);
        }
      });
    };

    client.onDisconnect = () => {
      isConnected.current = false;
      stompClient.current = null;
    };

    client.activate();

    return () => {
      if (client.active) {
        client.deactivate();
      }
    };
  }, []);

  const handleAccept = () => {
    if (!activeChallenge) return;
    if (synth) synth.playClick();
    const targetRoom = activeChallenge.roomCode;
    setActiveChallenge(null);
    router.push(`/play/multi/${targetRoom.toUpperCase()}`);
  };

  const handleDecline = () => {
    if (synth) synth.playClick();
    setActiveChallenge(null);
  };

  return (
    <AnimatePresence>
      {activeChallenge && (
        <div className="fixed inset-x-0 top-6 z-[999] flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ y: -50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -50, opacity: 0, scale: 0.9 }}
            className="pointer-events-auto glass-panel max-w-sm w-full rounded-2xl p-5 border border-indigo-500/30 dark:border-indigo-500/20 text-center shadow-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto mb-3 border border-indigo-500/10 animate-bounce">
              <Swords className="w-6 h-6" />
            </div>

            <h4 className="font-black text-slate-800 dark:text-white text-base">
              CHALLENGE RECEIVED!
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                {activeChallenge.senderUsername}
              </span>{" "}
              challenged you to a Sudoku Duel! ({activeChallenge.difficulty})
            </p>

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleDecline}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs cursor-pointer border border-slate-200/20"
              >
                <X className="w-3.5 h-3.5" /> Decline
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 flex items-center justify-center gap-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-md shadow-indigo-500/20 active:scale-[0.98] transition-all"
              >
                <Check className="w-3.5 h-3.5" /> Accept Duel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
