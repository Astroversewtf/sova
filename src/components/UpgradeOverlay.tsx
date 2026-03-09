"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { UPGRADES } from "@/game/constants";
import { emitSfxEvent } from "@/lib/audioEvents";
import type { UpgradeDef, UpgradeId, UpgradeRarity } from "@/game/types";

function getRarityLabel(rarity: UpgradeRarity): "Common" | "Rare" | "Epic" {
  if (rarity === "epic") return "Epic";
  if (rarity === "rare") return "Rare";
  return "Common";
}

const UPGRADE_ICONS: Record<UpgradeId, string> = {
  sharp_blade: "/sprites/upgrades/sharp_blade_01.png",
  vitality_surge: "/sprites/upgrades/vitality_surge_01.png",
  life_steal: "/sprites/upgrades/lifes_steal_01.png",
  thick_skin: "/sprites/upgrades/thick_skin_01.png",
  swift_feet: "/sprites/upgrades/swift_feet_01.png",
  second_wind: "/sprites/upgrades/second_wind_01.png",
};

const RARITY_STYLES: Record<string, {
  glow: string;
  outerGlow: string;
  badgeImage: string;
  cardBg: string;
}> = {
  Common: {
    glow: "shadow-[0_0_20px_rgba(107,114,128,0.25)]",
    outerGlow: "bg-[#6b7280]/15 shadow-[0_0_60px_20px_rgba(107,114,128,0.25)]",
    badgeImage: "/sprites/ui/overlay/overlay_common_01.png",
    cardBg: "#4f5751",
  },
  Rare: {
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.35)]",
    outerGlow: "bg-[#3b82f6]/15 shadow-[0_0_60px_20px_rgba(59,130,246,0.3)]",
    badgeImage: "/sprites/ui/overlay/overlay_rare_01.png",
    cardBg: "#143464",
  },
  Epic: {
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.35)]",
    outerGlow: "bg-[#a855f7]/15 shadow-[0_0_60px_20px_rgba(168,85,247,0.3)]",
    badgeImage: "/sprites/ui/overlay/overlay_epic_01.png",
    cardBg: "#403353",
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
      emitSfxEvent("skills-shuffle-stop");
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
      emitSfxEvent("skills-shuffle-stop");
    };
  }, [floor]);

  const spinAndReveal = useCallback((newChoices: UpgradeDef[]) => {
    emitSfxEvent("skills-shuffle-stop");
    emitSfxEvent("skills-shuffle-start");
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
              emitSfxEvent("skills-shuffle-stop");
              emitSfxEvent("skills-shuffle-end");
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
    window.dispatchEvent(
      new CustomEvent("sova:upgrade-chosen", { detail: upgrade.id }),
    );
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
        <div className="relative w-[190px] h-[44px] mb-5">
          <img
            src="/sprites/ui/overlay/overlay_common_01_clean.png"
            alt=""
            className="absolute inset-0 w-full h-full"
            style={{ imageRendering: "pixelated" }}
          />
          <div className="absolute inset-0 flex items-center justify-center gap-2">
            <span className="font-press-start-crisp text-[11px] text-[#d1d5db] translate-y-[2px]">+10</span>
            <img
              src="/sprites/energy-icon.png"
              alt=""
              className="w-4 h-4"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
        </div>

        {/* Subtitle */}
        <p className="font-pixel text-[9px] text-gray-400 mb-[40px] tracking-wider">
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

        {/* Reroll button */}
        <button
          onClick={handleReroll}
          disabled={!canReroll}
          className={`relative w-[270px] h-[46px] transition-all ${
            canReroll
              ? "hover:translate-y-[1px] active:translate-y-[2px] cursor-pointer"
              : "opacity-50 cursor-not-allowed"
          }`}
        >
          <img
            src="/sprites/ui/buttons/buttons_tile_l_01.png"
            alt=""
            className="absolute left-0 top-0 h-full w-auto"
            style={{ imageRendering: "pixelated", filter: "sepia(1) saturate(4.2) hue-rotate(345deg) brightness(1.08)" }}
          />
          <div
            className="absolute top-0 bottom-0 left-[46px] right-[46px]"
            style={{
              backgroundImage: "url('/sprites/ui/buttons/buttons_tile_m_01.png')",
              backgroundRepeat: "repeat-x",
              backgroundSize: "auto 100%",
              imageRendering: "pixelated",
              filter: "sepia(1) saturate(4.2) hue-rotate(345deg) brightness(1.08)",
            }}
          />
          <img
            src="/sprites/ui/buttons/buttons_tile_r_01.png"
            alt=""
            className="absolute right-0 top-0 h-full w-auto"
            style={{ imageRendering: "pixelated", filter: "sepia(1) saturate(4.2) hue-rotate(345deg) brightness(1.08)" }}
          />

          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 -translate-y-[5px]">
            <span
              className="font-press-start-crisp text-[12px] text-white"
              style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
            >
              REROLL
            </span>
            <img
              src="/sprites/items/coin/coin_01.png"
              alt=""
              className="w-4 h-4"
              style={{ imageRendering: "pixelated" }}
            />
            <span
              className="font-press-start-crisp text-[12px] text-white"
              style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}
            >
              {rerollCost}
            </span>
          </div>
        </button>

        {/* Coins display */}
        <div className="flex items-center gap-2 mt-4">
          <span className="font-press-start-crisp text-[8px] text-gray-300">YOU HAVE</span>
          <img
            src="/sprites/items/coin/coin_01.png"
            alt=""
            className="w-3 h-3"
            style={{ imageRendering: "pixelated" }}
          />
          <span className="font-press-start-crisp text-[8px] text-amber-300">{coins}</span>
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

function StoneCardBorder({
  edge = 46,
  spread = 16,
  spreadTop = 20,
}: {
  edge?: number;
  spread?: number;
  spreadTop?: number;
}) {
  const edgePx = `${edge}px`;
  const spreadPx = `${spread}px`;
  const spreadTopPx = `${spreadTop}px`;
  const tileSize = `${edgePx} ${edgePx}`;
  const borderBg = (image: string, repeat: "no-repeat" | "repeat-x" | "repeat-y") => ({
    backgroundImage: `url('/sprites/ui/overlay/${image}')`,
    backgroundRepeat: repeat,
    backgroundSize: tileSize,
    imageRendering: "pixelated" as const,
  });

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{ top: `-${spreadTopPx}`, right: `-${spreadPx}`, bottom: `-${spreadPx}`, left: `-${spreadPx}` }}
      aria-hidden="true"
    >
      <div className="absolute top-0 left-0" style={{ width: edgePx, height: edgePx, ...borderBg("overlay_tl_01.png", "no-repeat") }} />
      <div className="absolute top-0" style={{ left: edgePx, right: edgePx, height: edgePx, ...borderBg("overlay_tm_01.png", "repeat-x") }} />
      <div className="absolute top-0 right-0" style={{ width: edgePx, height: edgePx, ...borderBg("overlay_tr_01.png", "no-repeat") }} />

      <div className="absolute left-0" style={{ top: edgePx, bottom: edgePx, width: edgePx, ...borderBg("overlay_ml_01.png", "repeat-y") }} />
      <div className="absolute right-0" style={{ top: edgePx, bottom: edgePx, width: edgePx, ...borderBg("overlay_mr_01.png", "repeat-y") }} />

      <div className="absolute bottom-0 left-0" style={{ width: edgePx, height: edgePx, ...borderBg("overlay_dl_01.png", "no-repeat") }} />
      <div className="absolute bottom-0" style={{ left: edgePx, right: edgePx, height: edgePx, ...borderBg("overlay_dm_01.png", "repeat-x") }} />
      <div className="absolute bottom-0 right-0" style={{ width: edgePx, height: edgePx, ...borderBg("overlay_dr_01.png", "no-repeat") }} />
    </div>
  );
}

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
          className={`relative w-[240px] h-[300px] rounded-lg ${styles.glow} flex flex-col items-center justify-center px-10 py-8 transition-transform duration-150 ${
            interactive ? "cursor-pointer hover:scale-[1.06]" : ""
          } ${isSpinning ? "opacity-60" : ""}`}
          style={{ background: styles.cardBg }}
        >
        <StoneCardBorder />

        {/* Rarity badge PNG — centered top */}
        <img
          src={styles.badgeImage}
          alt={rarity}
          className="absolute top-0 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 w-[120px] h-auto"
          style={{ imageRendering: "pixelated" }}
        />

        {/* Icon with bounce */}
        <div
          className="mb-6"
          style={{ animation: "icon-bounce 2s ease-in-out infinite" }}
        >
          <img
            src={UPGRADE_ICONS[upgrade.id]}
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
