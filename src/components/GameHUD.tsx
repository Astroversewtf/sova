"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/gameStore";

export function GameHUD() {
  const isRunning = useGameStore((s) => s.isRunning);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const coins = useGameStore((s) => s.coinsCollected);
  const gems = useGameStore((s) => s.gemsCollected);
  const tickets = useGameStore((s) => s.goldenTicketsCollected);
  const floor = useGameStore((s) => s.floor);

  const pct = maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0;

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

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Top bar */}
      <div className="flex items-start justify-between px-3 pt-2">
        {/* Energy card */}
        <div className="bg-[#0f172a]/92 rounded-2xl border border-[#334155]/50 px-4 pt-3 pb-3 min-w-[280px]">
          {/* ENERGY label inside card */}
          <span className="font-pixel text-sm text-gray-200 tracking-wider">
            ENERGY
          </span>
          {/* Icon + bar row */}
          <div className="flex items-center gap-3 mt-2">
            {/* Lightning icon with green bg */}
            <div className="w-10 h-10 rounded-lg bg-[#9ecc3c] border-2 border-[#7a9e30] flex items-center justify-center shrink-0">
              <img
                src="/sprites/energy-icon.png"
                alt=""
                className="w-6 h-6"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            {/* Bar */}
            <div className="flex-1 relative h-9 bg-[#1e293b]/80 rounded-lg overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-lg transition-all duration-200"
                style={{
                  width: `${pct}%`,
                  background: "linear-gradient(to bottom, #d4f07a, #b8e550, #9ecc3c)",
                }}
              />
              {/* Glossy highlight */}
              <div
                className="absolute top-0 left-0 h-1/2 rounded-t-lg opacity-15 bg-white"
                style={{ width: `${pct}%` }}
              />
              {/* Text centered on bar */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-pixel text-sm text-[#1a1a2e]"
                  style={{ textShadow: "0 1px 0 rgba(255,255,255,0.3)" }}>
                  {energy}/{maxEnergy}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Resource badges */}
        <div className="flex items-center bg-[#0f172a]/92 rounded-xl border border-[#334155]/50 px-3 py-2 gap-4 mt-3">
          {/* Coins */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-600 shrink-0" />
            <span className="font-pixel text-[10px] text-amber-300">{coins}</span>
          </div>
          {/* Gems */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-teal-400 border border-teal-600 shrink-0" />
            <span className="font-pixel text-[10px] text-teal-300">{gems}</span>
          </div>
          {/* Tickets */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-yellow-400 border border-yellow-600 shrink-0" />
            <span className="font-pixel text-[10px] text-yellow-200">{tickets}</span>
          </div>
          {/* Separator */}
          <div className="w-px h-4 bg-[#334155]/60" />
          {/* Floor */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-slate-400 border border-slate-500 shrink-0" />
            <span className="font-pixel text-[10px] text-slate-200">F{floor}</span>
          </div>
        </div>
      </div>

      {/* Floor label (center, animated) */}
      {floorLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-pixel text-lg text-white animate-floor-label"
            style={{ textShadow: "0 0 8px rgba(0,0,0,0.8), 0 2px 4px rgba(0,0,0,0.6)" }}>
            {floorLabel}
          </span>
        </div>
      )}
    </div>
  );
}
