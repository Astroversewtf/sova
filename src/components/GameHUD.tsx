"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { TurnPhase } from "@/game/types";

/* ── MoG dual-outline: black inner (2px, on top) + white outer (4px, behind) ── */
function mogShadow(outerColor = "#fff") {
  return [
    // Black inner ring — listed first = drawn on top, closest to text
    "-2px -2px 0 #000", "2px -2px 0 #000",
    "-2px 2px 0 #000", "2px 2px 0 #000",
    "0 -2px 0 #000", "0 2px 0 #000",
    "-2px 0 0 #000", "2px 0 0 #000",
    "-1px -1px 0 #000", "1px -1px 0 #000",
    "-1px 1px 0 #000", "1px 1px 0 #000",
    // White outer ring — listed last = drawn behind, peeks out around black
    `-4px -4px 0 ${outerColor}`, `4px -4px 0 ${outerColor}`,
    `-4px 4px 0 ${outerColor}`, `4px 4px 0 ${outerColor}`,
    `0 -4px 0 ${outerColor}`, `0 4px 0 ${outerColor}`,
    `-4px 0 0 ${outerColor}`, `4px 0 0 ${outerColor}`,
    `-3px -3px 0 ${outerColor}`, `3px -3px 0 ${outerColor}`,
    `-3px 3px 0 ${outerColor}`, `3px 3px 0 ${outerColor}`,
    `0 -3px 0 ${outerColor}`, `0 3px 0 ${outerColor}`,
    `-3px 0 0 ${outerColor}`, `3px 0 0 ${outerColor}`,
  ].join(", ");
}

const MOG_SHADOW = mogShadow();

export function GameHUD() {
  const isRunning = useGameStore((s) => s.isRunning);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const coins = useGameStore((s) => s.coinsCollected);
  const orbs = useGameStore((s) => s.orbsCollected);
  const tickets = useGameStore((s) => s.goldenTicketsCollected);
  const floor = useGameStore((s) => s.floor);
  const turnPhase = useGameStore((s) => s.turnPhase);

  const pct = maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0;
  const canSkip = turnPhase === TurnPhase.PLAYER_INPUT;

  // Floor label animation
  const [floorLabel, setFloorLabel] = useState<string | null>(null);
  const prevFloor = useRef(floor);

  useEffect(() => {
    if (floor !== prevFloor.current) {
      prevFloor.current = floor;
      setFloorLabel(`FLOOR ${floor}`);
      const timer = setTimeout(() => setFloorLabel(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [floor]);

  if (!isRunning) return null;

  // Energy bar color
  const barBg =
    pct > 50
      ? "linear-gradient(to bottom, #d4f07a, #b8e550, #9ecc3c)"
      : pct > 25
        ? "linear-gradient(to bottom, #fde68a, #fbbf24, #d97706)"
        : "linear-gradient(to bottom, #fca5a5, #ef4444, #b91c1c)";

  return (
    <div className="absolute inset-0 pointer-events-none z-10" style={{ cursor: "none" }}>
      {/* ── Energy (centered top) ── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <span
          className="font-pixel text-[18px] text-[#b8e550]"
          style={{ textShadow: MOG_SHADOW }}
        >
          ENERGY
        </span>

        {/* Bar — dual-outline border: white outer + black inner */}
        <div
          className="relative w-[280px] h-[26px] mt-2 rounded-sm overflow-hidden"
          style={{
            boxShadow: "0 0 0 3px #fff, 0 0 0 5px #000",
            background: "#111827",
          }}
        >
          {/* Fill */}
          <div
            className="absolute inset-0 transition-all duration-200"
            style={{ width: `${pct}%`, background: barBg }}
          />
          {/* Glossy highlight */}
          <div
            className="absolute top-0 left-0 h-1/2 opacity-20 bg-white"
            style={{ width: `${pct}%` }}
          />
          {/* Number centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-pixel text-[16px] text-white"
              style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 -1px 0 #000, 0 1px 0 #000, -1px 0 0 #000, 1px 0 0 #000" }}
            >
              {energy}
            </span>
          </div>
        </div>
      </div>

      {/* ── Loot badges (top-right) ── */}
      <div className="absolute top-3 right-3 flex items-center gap-4">
        {/* Coins */}
        <div className="flex items-center gap-1.5">
          <img
            src="/sprites/items/coin/coin_01.png"
            alt=""
            className="w-6 h-6"
            style={{ imageRendering: "pixelated" }}
          />
          <span
            className="font-pixel text-[11px] text-amber-300"
            style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
          >
            {coins}
          </span>
        </div>
        {/* Orbs */}
        <div className="flex items-center gap-1.5">
          <img
            src="/sprites/items/orb/item_orb_01.png"
            alt=""
            className="w-6 h-6"
            style={{ imageRendering: "pixelated" }}
          />
          <span
            className="font-pixel text-[11px] text-teal-300"
            style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
          >
            {orbs}
          </span>
        </div>
        {/* Golden Tickets */}
        <div className="flex items-center gap-1.5">
          <img
            src="/sprites/items/golden_ticket/golden_ticket_lil_01.png"
            alt=""
            className="w-6 h-6"
            style={{ imageRendering: "pixelated" }}
          />
          <span
            className="font-pixel text-[11px] text-yellow-200"
            style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
          >
            {tickets}
          </span>
        </div>
        {/* Floor */}
        <span
          className="font-pixel text-[11px] text-slate-300"
          style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
        >
          F{floor}
        </span>
      </div>

      {/* ── Floor label (center, animated) ── */}
      {floorLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-pixel text-lg text-white animate-floor-label"
            style={{ textShadow: "0 0 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)" }}
          >
            {floorLabel}
          </span>
        </div>
      )}

      {/* ── PASS button (bottom center) ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto" style={{ cursor: "none" }}>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("sova:skip-turn"))}
          disabled={!canSkip}
          className={`transition-all ${
            canSkip
              ? "hover:scale-110 active:scale-95 cursor-pointer"
              : "opacity-40 cursor-not-allowed"
          }`}
        >
          <span
            className="font-pixel text-[20px]"
            style={{
              color: canSkip ? "#b8e550" : "#6b7280",
              textShadow: MOG_SHADOW,
            }}
          >
            PASS
          </span>
        </button>
      </div>
    </div>
  );
}
