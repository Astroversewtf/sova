"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { UPGRADES } from "@/game/constants";
import type { UpgradeDef, UpgradeId, UpgradeRarity } from "@/game/types";

function getRarityLabel(rarity: UpgradeRarity): "Common" | "Rare" | "Epic" {
  if (rarity === "epic") return "Epic";
  if (rarity === "rare") return "Rare";
  return "Common";
}

const RARITY_STYLES: Record<string, {
  border: string;
  glow: string;
  outerGlow: string;
  badge: string;
  badgeText: string;
}> = {
  Common: {
    border: "border-[#6b7280]",
    glow: "shadow-[0_0_20px_rgba(107,114,128,0.3),inset_0_0_20px_rgba(107,114,128,0.05)]",
    outerGlow: "bg-[#6b7280]/15 shadow-[0_0_60px_20px_rgba(107,114,128,0.25)]",
    badge: "bg-[#6b7280]",
    badgeText: "text-white",
  },
  Rare: {
    border: "border-[#3b82f6]",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.4),inset_0_0_20px_rgba(59,130,246,0.08)]",
    outerGlow: "bg-[#3b82f6]/15 shadow-[0_0_60px_20px_rgba(59,130,246,0.3)]",
    badge: "bg-[#3b82f6]",
    badgeText: "text-white",
  },
  Epic: {
    border: "border-[#a855f7]",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.4),inset_0_0_20px_rgba(168,85,247,0.08)]",
    outerGlow: "bg-[#a855f7]/15 shadow-[0_0_60px_20px_rgba(168,85,247,0.3)]",
    badge: "bg-[#a855f7]",
    badgeText: "text-white",
  },
};

function rollChoices(upgrades: Record<string, number>): UpgradeDef[] {
  const available = UPGRADES.filter((u) => {
    if (!u.stackable && (upgrades[u.id] ?? 0) > 0) return false;
    return true;
  });

  const byRarity = {
    common: available.filter((u) => u.rarity === "common"),
    rare: available.filter((u) => u.rarity === "rare"),
    epic: available.filter((u) => u.rarity === "epic"),
  };

  const picked: UpgradeDef[] = [];
  const usedIds = new Set<UpgradeId>();

  for (let i = 0; i < 3; i++) {
    const roll = Math.random();
    let target: "common" | "rare" | "epic";
    if (roll < 0.6) target = "common";
    else if (roll < 0.9) target = "rare";
    else target = "epic";

    const fallback: ("common" | "rare" | "epic")[] =
      target === "epic" ? ["epic", "rare", "common"]
        : target === "rare" ? ["rare", "common"]
          : ["common", "rare"];

    for (const r of fallback) {
      const pool = byRarity[r].filter((u) => !usedIds.has(u.id));
      if (pool.length > 0) {
        const choice = pool[Math.floor(Math.random() * pool.length)];
        picked.push(choice);
        usedIds.add(choice.id);
        break;
      }
    }
  }

  return picked;
}

export function UpgradeOverlay() {
  const floor = useGameStore((s) => s.upgradeScreenFloor);
  const energy = useGameStore((s) => s.energy);
  const coins = useGameStore((s) => s.coinsCollected);
  const upgrades = useGameStore((s) => s.upgrades);

  const [choices, setChoices] = useState<UpgradeDef[]>([]);
  const [revealed, setRevealed] = useState<(UpgradeDef | null)[]>([null, null, null]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [visible, setVisible] = useState(false);
  const spinTimers = useRef<ReturnType<typeof setInterval>[]>([]);

  // Initialize when floor changes (screen opens)
  useEffect(() => {
    if (floor === null) {
      setVisible(false);
      return;
    }
    const initial = rollChoices(upgrades);
    setChoices(initial);
    spinAndReveal(initial);
    // Fade in
    requestAnimationFrame(() => setVisible(true));

    return () => {
      spinTimers.current.forEach(clearInterval);
      spinTimers.current = [];
    };
  }, [floor]);

  const spinAndReveal = useCallback((newChoices: UpgradeDef[]) => {
    setIsSpinning(true);
    setRevealed([null, null, null]);

    // Clear previous timers
    spinTimers.current.forEach(clearInterval);
    spinTimers.current = [];

    const delays = [0, 150, 300];
    const spinCount = 10;
    const spinInterval = 120;
    let revealedCount = 0;

    newChoices.forEach((real, i) => {
      setTimeout(() => {
        let tick = 0;
        const timer = setInterval(() => {
          tick++;
          if (tick >= spinCount) {
            clearInterval(timer);
            setRevealed((prev) => {
              const next = [...prev];
              next[i] = real;
              return next;
            });
            revealedCount++;
            if (revealedCount >= newChoices.length) {
              setIsSpinning(false);
            }
          } else {
            const fake = UPGRADES[Math.floor(Math.random() * UPGRADES.length)];
            setRevealed((prev) => {
              const next = [...prev];
              next[i] = fake;
              return next;
            });
          }
        }, spinInterval);
        spinTimers.current.push(timer);
      }, delays[i]);
    });
  }, []);

  const handleSelect = useCallback((upgrade: UpgradeDef) => {
    if (isSpinning) return;
    const { GameScene } = require("@/game/scenes/GameScene");
    GameScene.upgradeCallback?.(upgrade.id);
  }, [isSpinning]);

  const handleReroll = useCallback(() => {
    if (isSpinning) return;
    const store = useGameStore.getState();
    const cost = store.getRerollCost();
    if (store.coinsCollected < cost) return;
    store.spendCoins(cost);
    store.incrementReroll();
    const newChoices = rollChoices(store.upgrades);
    setChoices(newChoices);
    spinAndReveal(newChoices);
  }, [isSpinning, spinAndReveal]);

  if (floor === null) return null;

  const rerollCost = useGameStore.getState().getRerollCost();
  const canReroll = coins >= rerollCost && !isSpinning;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/85" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center select-none">
        {/* Title — pushed up with negative margin */}
        <h1
          className="font-pixel text-[28px] text-white mb-5 -mt-16"
          style={{ textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 -2px 0 #000, 0 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000" }}
        >
          FLOOR {floor} COMPLETE
        </h1>

        {/* Energy bonus box */}
        <div className="flex items-center gap-2 bg-[#16a34a]/85 border border-[#22c55e] rounded-lg px-5 py-1.5 mb-5">
          <span className="font-pixel text-[12px] text-white">+10</span>
          <img
            src="/sprites/energy-icon.png"
            alt=""
            className="w-4 h-4"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        {/* Subtitle */}
        <p className="font-pixel text-[9px] text-gray-400 mb-6 tracking-wider">
          CHOOSE A SKILL
        </p>

        {/* Cards */}
        <div className="flex gap-5 mb-8">
          {revealed.map((upgrade, i) => (
            <UpgradeCard
              key={`${i}-${upgrade?.id ?? "spin"}`}
              upgrade={upgrade}
              stacks={upgrade ? (upgrades[upgrade.id] ?? 0) : 0}
              interactive={!isSpinning && upgrade !== null}
              isSpinning={isSpinning && upgrade !== null}
              onSelect={() => upgrade && handleSelect(upgrade)}
            />
          ))}
        </div>

        {/* Reroll button — same 3D press as PLAY button */}
        <button
          onClick={handleReroll}
          disabled={!canReroll}
          className={`relative font-pixel text-[10px] px-10 py-3 rounded-lg border-2 border-[#d4a017]/50 transition-all uppercase tracking-wide ${
            canReroll
              ? "bg-[#fbbf24] hover:bg-[#fde68a] text-white shadow-[0_4px_0_#b8860b] hover:shadow-[0_2px_0_#b8860b] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] cursor-pointer"
              : "bg-[#fbbf24]/40 text-white/50 shadow-[0_4px_0_#b8860b]/40 cursor-not-allowed"
          }`}
          style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 -1px 0 #000, 0 1px 0 #000, -1px 0 0 #000, 1px 0 0 #000" }}
        >
          REROLL  -{rerollCost}
        </button>

        {/* Coins display */}
        <div className="flex items-center gap-2 mt-4">
          <span className="font-pixel text-[8px] text-gray-400">YOU HAVE</span>
          <span className="font-pixel text-[10px] text-amber-400">{coins}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// Upgrade Card component
// ═══════════════════════════════════════

/* Bounce keyframes injected once */
const BOUNCE_STYLE = `
@keyframes icon-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
`;

function UpgradeCard({
  upgrade,
  stacks,
  interactive,
  isSpinning,
  onSelect,
}: {
  upgrade: UpgradeDef | null;
  stacks: number;
  interactive: boolean;
  isSpinning: boolean;
  onSelect: () => void;
}) {
  if (!upgrade) {
    return (
      <div className="w-[240px] h-[300px] rounded-lg bg-[#0f1225]/80 border-2 border-gray-700/30 animate-pulse" />
    );
  }

  const rarity = getRarityLabel(upgrade.rarity);
  const styles = RARITY_STYLES[rarity];

  return (
    <>
      <style>{BOUNCE_STYLE}</style>
      <div className="relative">
        {/* Outer glow behind card */}
        <div className={`absolute inset-0 rounded-lg ${styles.outerGlow} blur-sm`} />
        <div
          onClick={interactive ? onSelect : undefined}
          className={`relative w-[240px] h-[300px] rounded-lg border-2 ${styles.border} ${styles.glow} bg-[#0f1225]/95 flex flex-col items-center justify-center px-5 transition-transform duration-150 ${
            interactive ? "cursor-pointer hover:scale-[1.06]" : ""
          } ${isSpinning ? "opacity-60" : ""}`}
        >
        {/* Rarity badge — centered top */}
        <div className={`absolute top-3 left-1/2 -translate-x-1/2 ${styles.badge} rounded-md px-5 py-0.5`}>
          <span className={`font-pixel text-[11px] ${styles.badgeText} tracking-wide leading-tight`}>
            {rarity === "Common" ? "common" : rarity.toUpperCase()}
          </span>
        </div>

        {/* Icon with bounce */}
        <div
          className="mb-6"
          style={{ animation: "icon-bounce 2s ease-in-out infinite" }}
        >
          <img
            src="/sprites/items/key/key_02.png"
            alt=""
            className="w-14 h-14"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        {/* Name — bigger */}
        <span
          className="font-pixel text-[16px] text-white text-center mb-3"
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
        >
          {upgrade.name.toUpperCase()}
        </span>

        {/* Description — "Press Start 2P" font, not caps */}
        <span
          className="text-[9px] text-gray-400 text-center leading-relaxed"
          style={{ fontFamily: '"Press Start 2P", monospace' }}
        >
          {upgrade.description}
        </span>

        {/* Stack count */}
        {stacks > 0 && (
          <span
            className="text-[7px] text-gray-500 mt-3"
            style={{ fontFamily: '"Press Start 2P", monospace' }}
          >
            Owned: x{stacks}
          </span>
        )}
        </div>
      </div>
    </>
  );
}
