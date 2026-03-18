"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BUFF_UPGRADES,
  EVOLUTION_UPGRADES,
  UPGRADES,
  getBuffWeight,
  getEvolutionPathWeights,
  getUpgradeRarityChances,
} from "@/game/constants";
import { emitSfxEvent } from "@/lib/audioEvents";
import { useGameStore } from "@/stores/gameStore";
import type {
  BuffId,
  EvolutionPath,
  UpgradeDef,
  UpgradeId,
  UpgradeRarity,
} from "@/game/types";

type TierValue = 0 | 1 | 2 | 3;

function getRarityLabel(rarity: UpgradeRarity): "Common" | "Rare" | "Epic" {
  if (rarity === "epic") return "Epic";
  if (rarity === "rare") return "Rare";
  return "Common";
}

function rarityFallbackOrder(target: UpgradeRarity): UpgradeRarity[] {
  if (target === "epic") return ["epic", "rare", "common"];
  if (target === "rare") return ["rare", "common", "epic"];
  return ["common", "rare", "epic"];
}

function rollByWeight<T>(items: T[], getWeight: (item: T) => number): T | null {
  const weighted = items
    .map((item) => ({ item, weight: Math.max(0, getWeight(item)) }))
    .filter((entry) => entry.weight > 0);

  if (weighted.length === 0) return null;

  const total = weighted.reduce((acc, cur) => acc + cur.weight, 0);
  let roll = Math.random() * total;
  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.item;
  }
  return weighted[weighted.length - 1].item;
}

function rollRarity(floor: number): UpgradeRarity {
  const p = getUpgradeRarityChances(floor);
  const r = Math.random();
  if (r < p.common) return "common";
  if (r < p.common + p.rare) return "rare";
  return "epic";
}

function nextEvolutionForPath(path: EvolutionPath, tier: TierValue): UpgradeDef | null {
  const targetTier = (tier + 1) as TierValue;
  if (targetTier < 1 || targetTier > 3) return null;
  return (
    EVOLUTION_UPGRADES.find((u) => u.path === path && u.tier === targetTier) ?? null
  );
}

function getLockedEvolutionPath(
  buildTiers: Record<EvolutionPath, TierValue>,
): EvolutionPath | null {
  if (buildTiers.attack > 0) return "attack";
  if (buildTiers.defense > 0) return "defense";
  if (buildTiers.utility > 0) return "utility";
  return null;
}

function isBuffTakenInRun(upgradeHistory: UpgradeId[], id: BuffId): boolean {
  return upgradeHistory.includes(id);
}

function buildCandidatePool(
  floor: number,
  buildTiers: Record<EvolutionPath, TierValue>,
  upgradeHistory: UpgradeId[],
): UpgradeDef[] {
  const candidates: UpgradeDef[] = [];

  // Build upgrades:
  // - Before first pick: offer T1 of the 3 paths.
  // - After first pick: lock to that path only (T2 -> T3).
  const lockedPath = getLockedEvolutionPath(buildTiers);
  if (lockedPath) {
    const nextLocked = nextEvolutionForPath(lockedPath, buildTiers[lockedPath]);
    if (nextLocked && nextLocked.unlockFloor <= floor) {
      candidates.push(nextLocked);
    }
  } else {
    const nextAttack = nextEvolutionForPath("attack", buildTiers.attack);
    const nextDefense = nextEvolutionForPath("defense", buildTiers.defense);
    const nextUtility = nextEvolutionForPath("utility", buildTiers.utility);
    if (nextAttack && nextAttack.unlockFloor <= floor) candidates.push(nextAttack);
    if (nextDefense && nextDefense.unlockFloor <= floor) candidates.push(nextDefense);
    if (nextUtility && nextUtility.unlockFloor <= floor) candidates.push(nextUtility);
  }

  for (const buff of BUFF_UPGRADES) {
    if (buff.unlockFloor > floor) continue;
    if (isBuffTakenInRun(upgradeHistory, buff.id as BuffId)) continue;

    candidates.push(buff);
  }

  return candidates;
}

function getCandidateWeight(upgrade: UpgradeDef, floor: number): number {
  if (upgrade.kind === "evolution" && upgrade.path) {
    return getEvolutionPathWeights(floor)[upgrade.path];
  }
  return getBuffWeight(upgrade.id as BuffId, floor);
}

function rollChoices(
  floor: number,
  buildTiers: Record<EvolutionPath, TierValue>,
  upgradeHistory: UpgradeId[],
): UpgradeDef[] {
  const pool = buildCandidatePool(floor, buildTiers, upgradeHistory);
  if (pool.length <= 3) return [...pool];

  const picked: UpgradeDef[] = [];
  const usedIds = new Set<UpgradeId>();

   // Always reserve one slot for build progression when available.
   // This avoids starvation now that all build upgrades are EPIC.
   const evolutionCandidates = pool.filter((u) => u.kind === "evolution");
   if (evolutionCandidates.length > 0) {
     const evoPick = rollByWeight(evolutionCandidates, (u) => getCandidateWeight(u, floor));
     if (evoPick) {
       picked.push(evoPick);
       usedIds.add(evoPick.id);
     }
   }

  while (picked.length < 3) {
    const targetRarity = rollRarity(floor);
    const fallback = rarityFallbackOrder(targetRarity);
    let choice: UpgradeDef | null = null;

    for (const rarity of fallback) {
      const candidates = pool.filter(
        (u) => u.rarity === rarity && !usedIds.has(u.id),
      );
      choice = rollByWeight(candidates, (u) => getCandidateWeight(u, floor));
      if (choice) break;
    }

    if (!choice) {
      const anyCandidates = pool.filter((u) => !usedIds.has(u.id));
      choice = rollByWeight(anyCandidates, (u) => getCandidateWeight(u, floor));
    }

    if (!choice) break;
    picked.push(choice);
    usedIds.add(choice.id);
  }

  return picked;
}

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

const BOUNCE_STYLE = `
@keyframes icon-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
`;

function StoneCardBorder() {
  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{ top: "-20px", right: "-16px", bottom: "-16px", left: "-16px" }}
      aria-hidden="true"
    >
      <div className="absolute top-0 left-0 w-[46px] h-[46px] bg-[url('/sprites/ui/overlay/overlay_tl_01.png')] bg-no-repeat bg-[length:46px_46px]" />
      <div className="absolute top-0 left-[46px] right-[46px] h-[46px] bg-[url('/sprites/ui/overlay/overlay_tm_01.png')] bg-repeat-x bg-[length:46px_46px]" />
      <div className="absolute top-0 right-0 w-[46px] h-[46px] bg-[url('/sprites/ui/overlay/overlay_tr_01.png')] bg-no-repeat bg-[length:46px_46px]" />
      <div className="absolute left-0 top-[46px] bottom-[46px] w-[46px] bg-[url('/sprites/ui/overlay/overlay_ml_01.png')] bg-repeat-y bg-[length:46px_46px]" />
      <div className="absolute right-0 top-[46px] bottom-[46px] w-[46px] bg-[url('/sprites/ui/overlay/overlay_mr_01.png')] bg-repeat-y bg-[length:46px_46px]" />
      <div className="absolute bottom-0 left-0 w-[46px] h-[46px] bg-[url('/sprites/ui/overlay/overlay_dl_01.png')] bg-no-repeat bg-[length:46px_46px]" />
      <div className="absolute bottom-0 left-[46px] right-[46px] h-[46px] bg-[url('/sprites/ui/overlay/overlay_dm_01.png')] bg-repeat-x bg-[length:46px_46px]" />
      <div className="absolute bottom-0 right-0 w-[46px] h-[46px] bg-[url('/sprites/ui/overlay/overlay_dr_01.png')] bg-no-repeat bg-[length:46px_46px]" />
    </div>
  );
}

function UpgradeCard({
  upgrade,
  interactive,
  isSpinning,
  onSelect,
}: {
  upgrade: UpgradeDef | null;
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
        <div className={`absolute inset-0 rounded-lg ${styles.outerGlow} blur-sm`} />
        <div
          onClick={interactive ? onSelect : undefined}
          className={`relative w-[240px] h-[300px] rounded-lg ${styles.glow} flex flex-col items-center justify-center px-10 py-8 transition-transform duration-150 ${
            interactive ? "cursor-pointer hover:scale-[1.06]" : ""
          } ${isSpinning ? "opacity-60" : ""}`}
          style={{ background: styles.cardBg }}
        >
          <StoneCardBorder />
          <img
            src={styles.badgeImage}
            alt={rarity}
            className="absolute top-0 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 w-[120px] h-auto"
            style={{ imageRendering: "pixelated" }}
          />
          <div className="mb-6" style={{ animation: "icon-bounce 2s ease-in-out infinite" }}>
            <img
              src={upgrade.icon}
              alt=""
              className="w-14 h-14"
              style={{ imageRendering: "pixelated" }}
            />
          </div>
          <span className="font-pixel text-[16px] text-white text-center mb-3" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
            {upgrade.name.toUpperCase()}
          </span>
          <span className="text-[9px] text-gray-300 text-center leading-relaxed" style={{ fontFamily: '"Press Start 2P", monospace' }}>
            {upgrade.description}
          </span>
        </div>
      </div>
    </>
  );
}

export function UpgradeOverlay() {
  const floor = useGameStore((s) => s.upgradeScreenFloor);
  const coins = useGameStore((s) => s.coinsCollected);

  const [revealed, setRevealed] = useState<(UpgradeDef | null)[]>([null, null, null]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [visible, setVisible] = useState(false);
  const spinTimers = useRef<ReturnType<typeof setInterval>[]>([]);

  const rollCurrentChoices = useCallback(() => {
    const state = useGameStore.getState();
    const currentFloor = state.upgradeScreenFloor ?? state.floor;
    return rollChoices(currentFloor, state.buildTiers, state.upgradeHistory);
  }, []);

  const spinAndReveal = useCallback((newChoices: UpgradeDef[]) => {
    emitSfxEvent("skills-shuffle-stop");
    emitSfxEvent("skills-shuffle-start");
    setIsSpinning(true);
    setRevealed([null, null, null]);

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

  useEffect(() => {
    if (floor === null) {
      emitSfxEvent("skills-shuffle-stop");
      setVisible(false);
      return;
    }

    const initial = rollCurrentChoices();
    spinAndReveal(initial);
    requestAnimationFrame(() => setVisible(true));

    return () => {
      spinTimers.current.forEach(clearInterval);
      spinTimers.current = [];
      emitSfxEvent("skills-shuffle-stop");
    };
  }, [floor, rollCurrentChoices, spinAndReveal]);

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
    const newChoices = rollCurrentChoices();
    spinAndReveal(newChoices);
  }, [isSpinning, rollCurrentChoices, spinAndReveal]);

  if (floor === null) return null;

  const rerollCost = useGameStore.getState().getRerollCost();
  const canReroll = coins >= rerollCost && !isSpinning;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
      style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
    >
      <div className="absolute inset-0 bg-black/85" />
      <div className="relative z-10 flex flex-col items-center select-none">
        <h1 className="font-pixel text-[28px] text-white mb-5 -mt-16" style={{ textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 -2px 0 #000, 0 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000" }}>
          FLOOR {floor} COMPLETE
        </h1>

        <div className="relative w-[190px] h-[44px] mb-5">
          <img src="/sprites/ui/overlay/overlay_common_01_clean.png" alt="" className="absolute inset-0 w-full h-full" style={{ imageRendering: "pixelated" }} />
          <div className="absolute inset-0 flex items-center justify-center gap-2">
            <span className="font-press-start-crisp text-[11px] text-[#d1d5db] translate-y-[2px]">+10</span>
            <img src="/sprites/energy-icon.png" alt="" className="w-4 h-4" style={{ imageRendering: "pixelated" }} />
          </div>
        </div>

        <p className="font-pixel text-[9px] text-gray-400 mb-[40px] tracking-wider">
          CHOOSE A SKILL
        </p>

        <div className="flex gap-5 mb-8">
          {revealed.map((upgrade, i) => (
            <UpgradeCard
              key={`${i}-${upgrade?.id ?? "spin"}`}
              upgrade={upgrade}
              interactive={!isSpinning && upgrade !== null}
              isSpinning={isSpinning && upgrade !== null}
              onSelect={() => upgrade && handleSelect(upgrade)}
            />
          ))}
        </div>

        <button
          onClick={handleReroll}
          disabled={!canReroll}
          className={`relative w-[270px] h-[46px] transition-all ${
            canReroll ? "hover:translate-y-[1px] active:translate-y-[2px] cursor-pointer" : "opacity-50 cursor-not-allowed"
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
            <span className="font-press-start-crisp text-[12px] text-white" style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}>
              REROLL
            </span>
            <img src="/sprites/items/coin/coin_01.png" alt="" className="w-4 h-4" style={{ imageRendering: "pixelated" }} />
            <span className="font-press-start-crisp text-[12px] text-white" style={{ textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}>
              {rerollCost}
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2 mt-4">
          <span className="font-press-start-crisp text-[8px] text-gray-300">YOU HAVE</span>
          <img src="/sprites/items/coin/coin_01.png" alt="" className="w-3 h-3" style={{ imageRendering: "pixelated" }} />
          <span className="font-press-start-crisp text-[8px] text-amber-300">{coins}</span>
        </div>
      </div>
    </div>
  );
}
