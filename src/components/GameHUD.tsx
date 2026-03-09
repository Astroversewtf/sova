"use client";

import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { TurnPhase } from "@/game/types";

/* ── MoG dual-outline: black inner (2px, on top) + white outer (4px, behind) ── */
function mogShadow(outerColor = "#fff") {
  return [
    "-2px -2px 0 #000", "2px -2px 0 #000",
    "-2px 2px 0 #000", "2px 2px 0 #000",
    "0 -2px 0 #000", "0 2px 0 #000",
    "-2px 0 0 #000", "2px 0 0 #000",
    "-1px -1px 0 #000", "1px -1px 0 #000",
    "-1px 1px 0 #000", "1px 1px 0 #000",
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

const UPGRADE_ICON_BY_ID: Record<string, string> = {
  sharp_blade: "/sprites/upgrades/sharp_blade_01.png",
  vitality_surge: "/sprites/upgrades/vitality_surge_01.png",
  life_steal: "/sprites/upgrades/lifes_steal_01.png",
  thick_skin: "/sprites/upgrades/thick_skin_01.png",
  swift_feet: "/sprites/upgrades/swift_feet_01.png",
  second_wind: "/sprites/upgrades/second_wind_01.png",
};

const UPGRADE_ORDER = [
  "sharp_blade",
  "vitality_surge",
  "life_steal",
  "thick_skin",
  "swift_feet",
  "second_wind",
];

export function GameHUD() {
  const isRunning = useGameStore((s) => s.isRunning);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const coins = useGameStore((s) => s.coinsCollected);
  const orbs = useGameStore((s) => s.orbsCollected);
  const tickets = useGameStore((s) => s.goldenTicketsCollected);
  const floor = useGameStore((s) => s.floor);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const upgrades = useGameStore((s) => s.upgrades);

  const pct = maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0;
  const canSkip = turnPhase === TurnPhase.PLAYER_INPUT;
  const activeUpgradeEntries = UPGRADE_ORDER
    .map((id) => [id, upgrades[id] ?? 0] as const)
    .filter(([, stacks]) => stacks > 0);
  const visibleUpgradeEntries = activeUpgradeEntries.slice(0, 4);

  const [floorLabel, setFloorLabel] = useState<string | null>(null);
  const prevFloor = useRef(floor);
  const prevEnergy = useRef(energy);
  const [energyPulse, setEnergyPulse] = useState(false);

  useEffect(() => {
    if (floor !== prevFloor.current) {
      prevFloor.current = floor;
      setFloorLabel(`FLOOR ${floor}`);
      const timer = setTimeout(() => setFloorLabel(null), 1800);
      return () => clearTimeout(timer);
    }
  }, [floor]);

  useEffect(() => {
    const before = prevEnergy.current;
    prevEnergy.current = energy;
    if (!isRunning) return;
    if (energy > before) {
      setEnergyPulse(true);
      const t = window.setTimeout(() => setEnergyPulse(false), 150);
      return () => window.clearTimeout(t);
    }
  }, [energy, isRunning]);

  if (!isRunning) return null;

  const barBg =
    pct > 0
      ? "linear-gradient(to bottom, #b9e6ff, #6fb6ff, #2f80d4)"
      : "linear-gradient(to bottom, #334155, #1f2937, #111827)";

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <div
          className="relative w-[clamp(320px,40vw,420px)] mt-0"
          style={{ aspectRatio: "5 / 1" }}
        >
          <div className={`absolute inset-0 transition-transform duration-150 ${energyPulse ? "scale-[1.03]" : "scale-100"}`}>
            <div className="absolute inset-0">
              <div className="absolute left-[30%] right-[13.5%] top-[28%] bottom-[28%] rounded-[2px] overflow-hidden bg-[#0d2138]">
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-200"
                  style={{ width: `${pct}%`, background: barBg }}
                />
                <div
                  className="absolute top-0 left-0 h-1/2 opacity-25 bg-white"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <img
              src="/sprites/ui/hud/hud_energybar_01.png"
              alt=""
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ imageRendering: "pixelated" }}
            />

            <div
              className="absolute left-[23%] top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ width: "18%" }}
            >
              <span
                className="block text-center font-press-start-crisp text-[15px] text-gray-300 leading-none"
              >
                {energy}
              </span>
            </div>
          </div>

          {/* Upgrades (left, anchored to energy bar) */}
          <div className="absolute top-1/2 right-full mr-[clamp(28px,3.2vw,56px)] -translate-y-1/2 flex items-center gap-2">
            {Array.from({ length: 4 }).map((_, idx) => {
              const entry = visibleUpgradeEntries[idx];
              const id = entry?.[0];
              const stacks = entry?.[1] ?? 0;
              return (
                <div
                  key={`upgrade-slot-${idx}`}
                  className="relative w-10 h-10 border-[4px] border-[#3a3f48] bg-transparent flex items-center justify-center"
                >
                  {id && (
                    <>
                      <img
                        src={UPGRADE_ICON_BY_ID[id]}
                        alt=""
                        className="w-10 h-10"
                        style={{ imageRendering: "pixelated" }}
                      />
                      {stacks > 1 && (
                        <span
                          className="absolute -right-1 -bottom-1 font-pixel text-[7px] leading-none text-lime-300"
                          style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
                        >
                          {stacks}
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Loot (right, per-square, anchored to energy bar) */}
          <div className="absolute top-1/2 left-full ml-[clamp(28px,3.2vw,56px)] -translate-y-1/2 flex items-center gap-2">
            <div className="relative w-[42px] h-[42px] border-[4px] border-[#3a3f48] bg-transparent flex items-center justify-center">
              <img
                src="/sprites/items/coin/coin_01.png"
                alt=""
                className="absolute left-1/2 top-0 w-6 h-6 -translate-x-1/2 -translate-y-[60%]"
                style={{ imageRendering: "pixelated" }}
              />
              <span
                className="font-press-start-crisp text-[10px] text-amber-300 leading-none mt-[2px]"
                style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
              >
                {coins}
              </span>
            </div>

            <div className="relative w-[42px] h-[42px] border-[4px] border-[#3a3f48] bg-transparent flex items-center justify-center">
              <img
                src="/sprites/items/orb/item_orb_01.png"
                alt=""
                className="absolute left-1/2 top-0 w-6 h-6 -translate-x-1/2 -translate-y-[60%]"
                style={{ imageRendering: "pixelated" }}
              />
              <span
                className="font-press-start-crisp text-[10px] text-teal-300 leading-none mt-[2px]"
                style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
              >
                {orbs}
              </span>
            </div>

            <div className="relative w-[42px] h-[42px] border-[4px] border-[#3a3f48] bg-transparent flex items-center justify-center">
              <img
                src="/sprites/items/golden_ticket/golden_ticket_lil_01.png"
                alt=""
                className="absolute left-1/2 top-0 w-6 h-6 -translate-x-1/2 -translate-y-[60%]"
                style={{ imageRendering: "pixelated" }}
              />
              <span
                className="font-press-start-crisp text-[10px] text-yellow-200 leading-none mt-[2px]"
                style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
              >
                {tickets}
              </span>
            </div>

            <div className="relative w-[42px] h-[42px] border-[4px] border-[#3a3f48] bg-transparent flex items-center justify-center">
              <span
                className="font-press-start-crisp text-[10px] text-slate-300 leading-none"
                style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
              >
                F{floor}
              </span>
            </div>
          </div>
        </div>
      </div>

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

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("sova:request-skip-turn"))}
          disabled={!canSkip}
          className={`transition-all ${canSkip ? "hover:scale-[1.03] active:scale-[0.98] cursor-pointer" : "opacity-45 cursor-not-allowed"}`}
          aria-label="Pass turn"
        >
          <img
            src="/sprites/ui/buttons/buttons_skip_01.png"
            alt=""
            className="w-[144px] h-auto"
            style={{ imageRendering: "pixelated" }}
          />
        </button>
      </div>
    </div>
  );
}
