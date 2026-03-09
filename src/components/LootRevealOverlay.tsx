"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "@/stores/gameStore";

type RevealPhase = "coins" | "orbs";

function useCountUp(target: number, durationMs: number, active: boolean) {
  const [value, setValue] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active) {
      setValue(0);
      setDone(false);
      return;
    }

    let raf = 0;
    const start = performance.now();
    setDone(false);

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(target * eased));

      if (progress >= 1) {
        setValue(target);
        setDone(true);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, durationMs, active]);

  return { value, done };
}

export function LootRevealOverlay() {
  const lootPhase = useGameStore((s) => s.lootPhase);
  const data = useGameStore((s) => s.gameOverData);
  const advance = useGameStore((s) => s.advanceLootPhase);
  const [mounted, setMounted] = useState(false);
  const [introVisible, setIntroVisible] = useState(false);
  const [animIn, setAnimIn] = useState(false);

  const isRevealPhase = lootPhase === "coins" || lootPhase === "orbs";

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!isRevealPhase || !data) {
      setIntroVisible(false);
      setAnimIn(false);
      return;
    }

    setAnimIn(false);
    if (lootPhase === "coins") setIntroVisible(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimIn(true));
    });
  }, [isRevealPhase, lootPhase, data]);

  useEffect(() => {
    if (!isRevealPhase || lootPhase !== "coins" || !introVisible) return;
    const id = window.setTimeout(() => setIntroVisible(false), 1700);
    return () => window.clearTimeout(id);
  }, [isRevealPhase, lootPhase, introVisible]);

  const handleSkip = useCallback(() => {
    if (!isRevealPhase) return;
    if (introVisible) {
      setIntroVisible(false);
      return;
    }
    advance();
  }, [advance, introVisible, isRevealPhase]);

  useEffect(() => {
    if (!isRevealPhase) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isRevealPhase, handleSkip]);

  const hasActiveReveal = mounted && !!data && isRevealPhase;
  const phase: RevealPhase = lootPhase === "orbs" ? "orbs" : "coins";
  const target = data
    ? (phase === "coins" ? data.stats.coinsCollected : data.stats.orbsCollected)
    : 0;
  const duration = phase === "coins"
    ? Math.min(3600, Math.max(1800, target * 85))
    : Math.min(3400, Math.max(1700, target * 105));

  const { value, done } = useCountUp(target, duration, hasActiveReveal && animIn && !introVisible);

  useEffect(() => {
    if (!hasActiveReveal || introVisible || !done) return;
    const id = window.setTimeout(() => advance(), 850);
    return () => window.clearTimeout(id);
  }, [advance, done, hasActiveReveal, introVisible]);

  if (!hasActiveReveal) return null;

  const title = phase === "coins" ? "COINS" : "ORBS";
  const icon = phase === "coins"
    ? "/sprites/items/coin/coin_01.png"
    : "/sprites/items/orb/item_orb_01.png";

  const overlay = (
    <div
      className={`fixed inset-0 z-[70] select-none cursor-pointer transition-opacity duration-500 ${
        animIn ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: "rgba(0,0,0,0.96)" }}
      onClick={handleSkip}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {introVisible ? (
          <h1 className="font-pixel text-[64px] sm:text-[92px] text-white leading-none tracking-wide">
            GAME OVER
          </h1>
        ) : (
          <>
            <h1 className="font-pixel text-[42px] sm:text-[58px] text-white uppercase tracking-wide mb-8">
              {title}
            </h1>
            <img
              src={icon}
              alt=""
              className="w-20 h-20 sm:w-24 sm:h-24 mb-6 object-contain"
              style={{ imageRendering: "pixelated" }}
            />
            <span className="font-press-start-crisp text-[60px] sm:text-[86px] text-white leading-none">
              {value}
            </span>
          </>
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <span className="font-press-start-crisp text-[10px] text-white/70 tracking-wide animate-pulse">
          CLICK TO SKIP
        </span>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
