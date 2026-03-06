"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/stores/gameStore";

const textShadow =
  "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 -2px 0 #000, 0 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000";

export function GameOverOverlay() {
  const data = useGameStore((s) => s.gameOverData);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!data) {
      setVisible(false);
      return;
    }
    requestAnimationFrame(() => setVisible(true));
  }, [data]);

  if (!data) return null;

  const { stats, floor } = data;

  const handlePlayAgain = () => {
    useGameStore.getState().endRun();
    // Tell Phaser to restart
    window.dispatchEvent(new CustomEvent("sova:run-end-action", { detail: "play-again" }));
  };

  const handleLobby = () => {
    useGameStore.getState().endRun();
    window.dispatchEvent(new CustomEvent("sova:run-end-action", { detail: "lobby" }));
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/85" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center select-none">
        {/* ── GAME OVER title ── */}
        <div className="flex gap-2 mb-4">
          <div className="border-2 border-white/80 px-5 py-2">
            <span
              className="font-pixel text-[28px] text-white"
              style={{ textShadow }}
            >
              GAME
            </span>
          </div>
          <div className="border-2 border-white/80 px-5 py-2">
            <span
              className="font-pixel text-[28px] text-white"
              style={{ textShadow }}
            >
              OVER
            </span>
          </div>
        </div>

        {/* Floor label */}
        <span className="font-pixel text-[10px] text-gray-500 mb-10 tracking-wider">
          FLOOR {floor}
        </span>

        {/* ── LOOT section ── */}
        <span className="font-pixel text-[10px] text-gray-400 mb-5 tracking-wider">
          — LOOT —
        </span>

        <div className="flex flex-col gap-4 mb-6 w-[280px]">
          {/* Coins row */}
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-amber-600 shrink-0" />
            <span className="font-pixel text-[11px] text-gray-200 ml-3">
              COINS
            </span>
            <span
              className="font-pixel text-[16px] text-amber-400 ml-auto"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
            >
              {stats.coinsCollected}
            </span>
          </div>

          {/* Orbs row */}
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-violet-400 border-2 border-violet-600 shrink-0" />
            <span className="font-pixel text-[11px] text-gray-200 ml-3">
              ORBS
            </span>
            <span
              className="font-pixel text-[16px] text-violet-400 ml-auto"
              style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
            >
              {stats.orbsCollected}
            </span>
          </div>

          {/* Golden Tickets row (if any) */}
          {stats.goldenTicketsCollected > 0 && (
            <div className="flex items-center">
              <img
                src="/sprites/items/golden_ticket/golden_ticket_big_01.png"
                alt="Golden Ticket"
                className="w-6 h-6 shrink-0 object-contain"
              />
              <span className="font-pixel text-[11px] text-gray-200 ml-3">
                TICKETS
              </span>
              <span
                className="font-pixel text-[16px] text-emerald-400 ml-auto"
                style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
              >
                {stats.goldenTicketsCollected}
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-[240px] h-px bg-gray-700/50 mb-6" />

        {/* ── STATS section ── */}
        <span className="font-pixel text-[10px] text-gray-400 mb-5 tracking-wider">
          — STATS —
        </span>

        <div className="flex flex-col gap-3 mb-10 w-[280px]">
          <StatRow label="FLOORS CLEARED" value={stats.floorsCleared} color="text-blue-400" />
          <StatRow label="ENEMIES KILLED" value={stats.enemiesKilled} color="text-red-400" />
          <StatRow label="BOSSES KILLED" value={stats.bossesKilled} color="text-purple-400" />
          <StatRow label="CHESTS OPENED" value={stats.chestsOpened} color="text-amber-400" />
          <StatRow label="TRAPS TRIGGERED" value={stats.trapsTriggered} color="text-orange-400" />
        </div>

        {/* ── Buttons ── */}
        <div className="flex items-center gap-4">
          {/* PLAY AGAIN — lime green 3D */}
          <button
            type="button"
            onClick={handlePlayAgain}
            className="relative font-pixel text-[11px] px-10 py-3 rounded-lg bg-[#b8e550] text-[#1a1a2e] tracking-wide shadow-[0_4px_0_#7a9e30] hover:brightness-110 hover:shadow-[0_2px_0_#7a9e30] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all cursor-pointer"
            style={{ textShadow: "none" }}
          >
            PLAY AGAIN
          </button>

          {/* LOBBY — house icon button */}
          <button
            type="button"
            onClick={handleLobby}
            className="relative w-12 h-12 rounded-lg bg-[#334155] border border-[#475569] shadow-[0_4px_0_#1e293b] hover:bg-[#475569] hover:shadow-[0_2px_0_#1e293b] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all cursor-pointer flex items-center justify-center"
          >
            {/* Simple house SVG */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              className="text-gray-300"
            >
              <path
                d="M10 2L2 9h3v7h4v-4h2v4h4V9h3L10 2z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-pixel text-[8px] text-gray-400">{label}</span>
      <span className={`font-pixel text-[12px] ${color}`}>{value}</span>
    </div>
  );
}
