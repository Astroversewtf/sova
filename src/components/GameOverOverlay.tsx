"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { usePlayerStore } from "@/stores/playerStore";

const textOutline =
  "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 -2px 0 #000, 0 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000";

/* ── MoG gradient text styles ── */
const GOLD_TEXT = {
  background:
    "linear-gradient(180deg, #F5EA54 0%, #FFBD21 25%, #F5EA54 50%, #C35221 75%, #FC8518 100%)",
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  filter:
    "drop-shadow(1px 1px 0px #000) drop-shadow(-1px -1px 0px #000) drop-shadow(1px -1px 0px #000) drop-shadow(-1px 1px 0px #000)",
};

const RED_TEXT = {
  background:
    "linear-gradient(180deg, #fca5a5 0%, #ef4444 25%, #fca5a5 50%, #b91c1c 75%, #dc2626 100%)",
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  filter:
    "drop-shadow(1px 1px 0px #000) drop-shadow(-1px -1px 0px #000) drop-shadow(1px -1px 0px #000) drop-shadow(-1px 1px 0px #000)",
};

const BLUE_TEXT = {
  background:
    "linear-gradient(180deg, #93c5fd 0%, #3b82f6 25%, #93c5fd 50%, #1d4ed8 75%, #2563eb 100%)",
  WebkitBackgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  filter:
    "drop-shadow(1px 1px 0px #000) drop-shadow(-1px -1px 0px #000) drop-shadow(1px -1px 0px #000) drop-shadow(-1px 1px 0px #000)",
};

export function GameOverOverlay() {
  const data = useGameStore((s) => s.gameOverData);
  const lootPhase = useGameStore((s) => s.lootPhase);
  const [visible, setVisible] = useState(false);
  const walletAddress = usePlayerStore((s) => s.walletAddress);

  const keysUsed = useGameStore((s) => s.keysUsed);

  const submitRun = async () => {
    if(!walletAddress || !data) return;
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: walletAddress,
          stats: data.stats,
          floor: data.floor,
          keysUsed,
        }),
      });
      if(res.ok) {
        const result = await res.json();
        usePlayerStore.setState({
          coins: result.coins,
          gems: result.gems,
          goldenTickets: result.goldenTickets,
          bestScore: result.bestScore,
          weeklyScore: result.weeklyScore
        })
      }
    } catch(err) {
      console.error("Failed to submit run", err);
    }
  }

  useEffect(() => {
    if (lootPhase !== "summary" || !data) {
      setVisible(false);
      return;
    }
    requestAnimationFrame(() => setVisible(true));
  }, [lootPhase, data]);

  if (!data || lootPhase !== "summary") return null;

  const { stats, floor } = data;

  const handlePlayAgain = async () => {
    await submitRun();
    useGameStore.getState().endRun();
    window.dispatchEvent(
      new CustomEvent("sova:run-end-action", { detail: "play-again" }),
    );
  };

  const handleLobby = async () => {
    await submitRun();
    useGameStore.getState().endRun();
    window.dispatchEvent(
      new CustomEvent("sova:run-end-action", { detail: "lobby" }),
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: "rgba(0, 0, 0, 0.92)" }}
    >
      <div className="relative z-10 flex flex-col items-center select-none w-[380px] sm:w-[440px]">
        {/* ── GAME OVER title (MoG bordered boxes) ── */}
        <div className="flex gap-2 mb-3">
          <div className="border-[3px] border-white px-5 py-2">
            <span
              className="font-pixel text-[28px] sm:text-[32px] text-white"
              style={{ textShadow: textOutline }}
            >
              GAME
            </span>
          </div>
          <div className="border-[3px] border-white px-5 py-2">
            <span
              className="font-pixel text-[28px] sm:text-[32px] text-white"
              style={{ textShadow: textOutline }}
            >
              OVER
            </span>
          </div>
        </div>

        {/* ── LOOT divider ── */}
        <div className="flex items-center gap-3 w-full mb-6 mt-4">
          <div className="h-px bg-gray-600 flex-1" />
          <span
            className="font-pixel text-[14px] text-white tracking-wider"
            style={{ textShadow: textOutline }}
          >
            LOOT
          </span>
          <div className="h-px bg-gray-600 flex-1" />
        </div>

        {/* ── Loot grid (MoG 3-column: Coins | Tickets | Orbs) ── */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-6 w-full">
          {/* COINS */}
          <LootColumn
            label="COINS"
            icon="/sprites/items/coin/coin_01.png"
            value={stats.coinsCollected}
            gradientStyle={GOLD_TEXT}
            glowColor="#FFD819"
          />
          {/* JACKPOT (Golden Tickets) */}
          <LootColumn
            label="JACKPOT"
            icon="/sprites/items/golden_ticket/golden_ticket_big_01.png"
            value={stats.goldenTicketsCollected}
            gradientStyle={RED_TEXT}
            glowColor="#ef4444"
          />
          {/* ORBS */}
          <LootColumn
            label="ORBS"
            icon="/sprites/items/orb/item_orb_01.png"
            value={stats.orbsCollected}
            gradientStyle={BLUE_TEXT}
            glowColor="#3b82f6"
          />
        </div>

        {/* ── STATS divider ── */}
        <div className="flex items-center gap-3 w-full mb-5">
          <div className="h-px bg-gray-600 flex-1" />
          <span
            className="font-pixel text-[14px] text-white tracking-wider"
            style={{ textShadow: textOutline }}
          >
            STATS
          </span>
          <div className="h-px bg-gray-600 flex-1" />
        </div>

        {/* ── Stats rows (MoG style with bg) ── */}
        <div className="flex flex-col gap-1.5 mb-8 w-full">
          <StatRow label="FLOOR" value={`${floor}F`} highlight />
          <StatRow label="ENEMIES KILLED" value={`${stats.enemiesKilled}`} />
          <StatRow label="BOSSES KILLED" value={`${stats.bossesKilled}`} />
          <StatRow label="CHESTS OPENED" value={`${stats.chestsOpened}`} />
          <StatRow label="TRAPS TRIGGERED" value={`${stats.trapsTriggered}`} />
        </div>

        {/* ── Buttons (MoG style: Play Again + Home) ── */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePlayAgain}
            className="font-pixel text-[12px] px-10 py-3 rounded-lg bg-[#b8e550] text-white tracking-wide shadow-[0_4px_0_#7a9e30] hover:brightness-110 hover:shadow-[0_2px_0_#7a9e30] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all cursor-pointer uppercase"
            style={{
              textShadow:
                "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 -2px 0 #000, 0 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000",
            }}
          >
            PLAY AGAIN
          </button>

          <button
            type="button"
            onClick={handleLobby}
            className="w-12 h-12 rounded-lg bg-[#334155] border border-[#475569] shadow-[0_4px_0_#1e293b] hover:bg-[#475569] hover:shadow-[0_2px_0_#1e293b] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all cursor-pointer flex items-center justify-center"
          >
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

function LootColumn({
  label,
  icon,
  value,
  gradientStyle,
  glowColor,
}: {
  label: string;
  icon: string;
  value: number;
  gradientStyle: Record<string, string>;
  glowColor: string;
}) {
  const textOutline =
    "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 -2px 0 #000, 0 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000";

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="font-pixel text-[11px] sm:text-[13px]" style={gradientStyle}>
        {label}
      </span>
      <img
        src={icon}
        alt=""
        className="w-12 h-12 sm:w-14 sm:h-14"
        style={{
          imageRendering: "pixelated",
          filter: `drop-shadow(0 0 8px ${glowColor}66)`,
        }}
      />
      <span
        className="font-pixel text-[24px] sm:text-[30px] text-white"
        style={{
          filter: `drop-shadow(0 0 12px ${glowColor}) drop-shadow(0 0 24px ${glowColor}60)`,
          textShadow: `0 0 20px ${glowColor}aa, ${textOutline}`,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-2.5 rounded ${
        highlight ? "bg-[#1e293b]/80" : "bg-transparent"
      }`}
    >
      <span className="font-pixel text-[9px] text-gray-400 tracking-wide">
        {label}
      </span>
      <span className="font-pixel text-[13px] text-white">{value}</span>
    </div>
  );
}
