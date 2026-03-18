"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "@/stores/gameStore";
import { TurnPhase } from "@/game/types";
import { UPGRADE_BY_ID } from "@/game/constants";

/* ── Energy bar shimmer ── */
function EnergyShimmer({ pct }: { pct: number }) {
  if (pct <= 0) return null;

  return (
    <div className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none" style={{ width: `${pct}%` }}>
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 35% 120% at 50% 50%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)",
          backgroundSize: "200% 100%",
          animation: "energy-shimmer 3.5s linear infinite",
        }}
      />
    </div>
  );
}

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

export function GameHUD() {
  const isRunning = useGameStore((s) => s.isRunning);
  const tutorialMode = useGameStore((s) => s.tutorialMode);
  const energy = useGameStore((s) => s.energy);
  const maxEnergy = useGameStore((s) => s.maxEnergy);
  const coins = useGameStore((s) => s.coinsCollected);
  const orbs = useGameStore((s) => s.orbsCollected);
  const floor = useGameStore((s) => s.floor);
  const turnPhase = useGameStore((s) => s.turnPhase);
  const buildTiers = useGameStore((s) => s.buildTiers);
  const activeBuffs = useGameStore((s) => s.activeBuffs);

  const pct = maxEnergy > 0 ? (energy / maxEnergy) * 100 : 0;
  const canSkip = turnPhase === TurnPhase.PLAYER_INPUT;
  const buildUpgradeIds = useMemo(() => {
    const ids: string[] = [];
    if (buildTiers.attack > 0) ids.push(`evo_rift_fang_t${buildTiers.attack}`);
    if (buildTiers.defense > 0) ids.push(`evo_stone_veil_t${buildTiers.defense}`);
    if (buildTiers.utility > 0) ids.push(`evo_volt_core_t${buildTiers.utility}`);
    return ids;
  }, [buildTiers]);
  const activeBuffIds = useMemo(() => {
    const ids: string[] = [];
    const seen = new Set<string>();
    for (const buff of activeBuffs) {
      if (seen.has(buff.id)) continue;
      seen.add(buff.id);
      ids.push(buff.id);
    }
    return ids;
  }, [activeBuffs]);
  const visibleUpgradeIds = useMemo(
    () => [...buildUpgradeIds, ...activeBuffIds].slice(0, 4),
    [buildUpgradeIds, activeBuffIds],
  );

  const prevEnergy = useRef(energy);
  const [energyPulse, setEnergyPulse] = useState(false);
  const [tutorialDialogue, setTutorialDialogue] = useState("");
  const [tutorialDialogueVisible, setTutorialDialogueVisible] = useState(false);
  const [typedDialogue, setTypedDialogue] = useState("");

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

  useEffect(() => {
    if (!tutorialMode) {
      setTutorialDialogue("");
      setTutorialDialogueVisible(false);
      setTypedDialogue("");
      return;
    }

    const onTutorialDialogue = (e: Event) => {
      const detail = (e as CustomEvent<{ text?: string; visible?: boolean }>).detail;
      const text = detail?.text ?? "";
      const visible = detail?.visible ?? false;
      setTutorialDialogue(text);
      setTutorialDialogueVisible(visible);
    };

    window.addEventListener("sova:tutorial-dialogue", onTutorialDialogue as EventListener);
    return () => {
      window.removeEventListener("sova:tutorial-dialogue", onTutorialDialogue as EventListener);
    };
  }, [tutorialMode]);

  useEffect(() => {
    if (!tutorialDialogueVisible || !tutorialDialogue) {
      setTypedDialogue("");
      return;
    }

    let i = 0;
    setTypedDialogue("");
    const ticker = window.setInterval(() => {
      i = Math.min(tutorialDialogue.length, i + 2);
      setTypedDialogue(tutorialDialogue.slice(0, i));
      if (i >= tutorialDialogue.length) {
        window.clearInterval(ticker);
      }
    }, 16);

    return () => window.clearInterval(ticker);
  }, [tutorialDialogue, tutorialDialogueVisible]);

  if (!isRunning) return null;

  const barBg =
    pct > 0
      ? "linear-gradient(to bottom, #b9e6ff, #6fb6ff, #2f80d4)"
      : "linear-gradient(to bottom, #334155, #1f2937, #111827)";
  // Keep high values visually unchanged while giving low-energy values
  // enough visible width inside the decorative frame.
  const bluePct = pct <= 0 ? 0 : Math.min(100, pct + (1 - pct / 100) * 12);
  const showTutorialCard = tutorialMode && tutorialDialogueVisible;

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      <div className="hidden md:flex absolute top-3 left-1/2 -translate-x-1/2 flex-col items-center">
        <div
          className="relative w-[clamp(320px,40vw,420px)] mt-0"
          style={{ aspectRatio: "5 / 1" }}
        >
          <div className={`absolute inset-0 transition-transform duration-150 ${energyPulse ? "scale-[1.03]" : "scale-100"}`}>
            <div className="absolute inset-0">
              <div className="absolute left-[30%] right-[13.5%] top-[28%] bottom-[28%] rounded-[2px] overflow-hidden bg-[#0d2138]">
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-200"
                  style={{ width: `${bluePct}%`, background: barBg }}
                />
                <div
                  className="absolute top-0 left-0 h-1/2 opacity-25 bg-white"
                  style={{ width: `${pct}%` }}
                />
                <EnergyShimmer pct={pct} />
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
              const id = visibleUpgradeIds[idx];
              const icon = id ? UPGRADE_BY_ID[id]?.icon : null;
              return (
                <div
                  key={`upgrade-slot-${idx}`}
                  className="relative w-10 h-10 bg-transparent flex items-center justify-center"
                >
                  <img
                    src="/sprites/ui/settings/buttons_overlay_fill_02.png"
                    alt=""
                    className="absolute inset-0 z-0 w-full h-full pointer-events-none"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <img
                    src="/sprites/ui/settings/buttons_overlay_empty_02.png"
                    alt=""
                    className="absolute inset-0 z-10 w-full h-full pointer-events-none"
                    style={{ imageRendering: "pixelated" }}
                  />
                  {icon && (
                    <img
                      src={icon}
                      alt=""
                      className="relative z-20 w-10 h-10"
                      style={{ imageRendering: "pixelated" }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Loot (right, anchored to energy bar) */}
          <div className="absolute top-1/2 left-full ml-[clamp(28px,3.2vw,56px)] -translate-y-1/2 flex items-center gap-2">
            <div className="w-[86px] h-[42px] flex items-center justify-start gap-1 pl-3">
              <img
                src="/sprites/items/coin/coin_01.png"
                alt=""
                className="w-8 h-8"
                style={{ imageRendering: "pixelated" }}
              />
              <span className="font-press-start-crisp text-[10px] text-gray-300 leading-none">
                {coins}
              </span>
            </div>

            <div className="w-[70px] h-[42px] flex items-center justify-start gap-1 pl-3">
              <img
                src="/sprites/items/orb/item_orb_01.png"
                alt=""
                className="w-8 h-8"
                style={{ imageRendering: "pixelated" }}
              />
              <span className="font-press-start-crisp text-[10px] text-gray-300 leading-none">
                {orbs}
              </span>
            </div>

            <div className="relative w-[42px] h-[42px] bg-transparent flex items-center justify-center">
              <img
                src="/sprites/ui/onboarding/buttons_square_01.png"
                alt=""
                className="absolute inset-0 z-0 w-full h-full pointer-events-none"
                style={{ imageRendering: "pixelated" }}
              />
              <span
                className="relative z-10 font-press-start-crisp text-[10px] text-gray-300 leading-none"
              >
                F{floor}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile HUD */}
      <div className="md:hidden absolute left-1/2 -translate-x-1/2 top-[max(env(safe-area-inset-top),8px)] flex flex-col items-center gap-2">
        <div
          className="relative w-[min(78vw,320px)]"
          style={{ aspectRatio: "5 / 1" }}
        >
          <div className={`absolute inset-0 transition-transform duration-150 ${energyPulse ? "scale-[1.03]" : "scale-100"}`}>
            <div className="absolute inset-0">
              <div className="absolute left-[30%] right-[13.5%] top-[28%] bottom-[28%] rounded-[2px] overflow-hidden bg-[#0d2138]">
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-200"
                  style={{ width: `${bluePct}%`, background: barBg }}
                />
                <div
                  className="absolute top-0 left-0 h-1/2 opacity-25 bg-white"
                  style={{ width: `${pct}%` }}
                />
                <EnergyShimmer pct={pct} />
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
              <span className="block text-center font-press-start-crisp text-[13px] text-gray-300 leading-none">
                {energy}
              </span>
            </div>
          </div>
        </div>

        <div className="w-[min(96vw,430px)] px-2 flex items-center justify-between">
          {/* Mobile upgrades (left, compact) */}
          <div className="flex items-center gap-1">
            {Array.from({ length: 4 }).map((_, idx) => {
              const id = visibleUpgradeIds[idx];
              const icon = id ? UPGRADE_BY_ID[id]?.icon : null;
              return (
                <div
                  key={`mobile-upgrade-slot-${idx}`}
                  className="relative w-8 h-8 bg-transparent flex items-center justify-center"
                >
                  <img
                    src="/sprites/ui/settings/buttons_overlay_fill_02.png"
                    alt=""
                    className="absolute inset-0 z-0 w-full h-full pointer-events-none"
                    style={{ imageRendering: "pixelated" }}
                  />
                  <img
                    src="/sprites/ui/settings/buttons_overlay_empty_02.png"
                    alt=""
                    className="absolute inset-0 z-10 w-full h-full pointer-events-none"
                    style={{ imageRendering: "pixelated" }}
                  />
                  {icon && (
                    <img
                      src={icon}
                      alt=""
                      className="relative z-20 w-8 h-8"
                      style={{ imageRendering: "pixelated" }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile loot + floor (right, compact) */}
          <div className="flex items-center gap-1">
            <div className="w-[76px] h-[34px] flex items-center justify-start gap-1 pl-2.5">
              <img
                src="/sprites/items/coin/coin_01.png"
                alt=""
                className="w-7 h-7"
                style={{ imageRendering: "pixelated" }}
              />
              <span className="font-press-start-crisp text-[9px] text-gray-300 leading-none">
                {coins}
              </span>
            </div>

            <div className="w-[62px] h-[34px] flex items-center justify-start gap-1 pl-2.5">
              <img
                src="/sprites/items/orb/item_orb_01.png"
                alt=""
                className="w-7 h-7"
                style={{ imageRendering: "pixelated" }}
              />
              <span className="font-press-start-crisp text-[9px] text-gray-300 leading-none">
                {orbs}
              </span>
            </div>

            <div className="relative w-[34px] h-[34px] bg-transparent flex items-center justify-center">
              <img
                src="/sprites/ui/onboarding/buttons_square_01.png"
                alt=""
                className="absolute inset-0 z-0 w-full h-full pointer-events-none"
                style={{ imageRendering: "pixelated" }}
              />
              <span className="relative z-10 font-press-start-crisp text-[8px] text-gray-300 leading-none">
                F{floor}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="hidden md:block absolute left-1/2 -translate-x-1/2 pointer-events-auto"
        style={{ bottom: showTutorialCard ? "11.5rem" : "1rem" }}
      >
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

      <div
        className="md:hidden absolute left-1/2 -translate-x-1/2 pointer-events-auto"
        style={{
          bottom: showTutorialCard
            ? "calc(max(env(safe-area-inset-bottom), 2rem) + 8.75rem)"
            : "max(env(safe-area-inset-bottom), 2rem)",
        }}
      >
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("sova:request-skip-turn"))}
          disabled={!canSkip}
          className={`transition-all ${canSkip ? "active:scale-[0.98] cursor-pointer" : "opacity-45 cursor-not-allowed"}`}
          aria-label="Pass turn"
        >
          <img
            src="/sprites/ui/buttons/buttons_skip_01.png"
            alt=""
            className="w-[128px] h-auto"
            style={{ imageRendering: "pixelated" }}
          />
        </button>
      </div>

      <div
        className={`absolute inset-x-0 bottom-0 z-20 pointer-events-none transition-opacity duration-150 ${showTutorialCard ? "opacity-100" : "opacity-0"}`}
      >
        <div className="relative w-full h-[140px] md:h-[170px] bg-black/95 border-t-4 border-white">
          <img
            src="/images/tutorial-astro.png"
            alt=""
            className="absolute left-1 md:left-2 bottom-0 h-[185px] md:h-[260px] w-auto"
            style={{ imageRendering: "pixelated" }}
          />
          <div className="absolute inset-0 flex items-center justify-center px-[140px] md:px-[300px]">
            <p className="font-press-start text-[9px] md:text-[13px] leading-relaxed text-white text-center">
              <span className="text-[#6fb6ff]">ASTRO:</span>{" "}
              <span>{typedDialogue}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
