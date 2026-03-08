"use client";

import { useEffect, useState, useCallback } from "react";
import { useGameStore } from "@/stores/gameStore";

/* ── Count-up hook (MoG cubic ease-out at 60fps) ── */
function useCountUp(target: number, duration: number, active: boolean): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) {
      setValue(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(target * eased));
      if (progress >= 1) {
        clearInterval(id);
        setValue(target);
      }
    }, 16);
    return () => clearInterval(id);
  }, [target, duration, active]);

  return value;
}

/* ── Phase configs ── */
const PHASE_CONFIG = {
  coins: {
    title: "COINS",
    icon: "/sprites/items/coin/coin_01.png",
    bg: "radial-gradient(ellipse at 50% 40%, rgba(120, 80, 20, 0.9) 0%, rgba(40, 25, 8, 0.95) 50%, rgba(0, 0, 0, 1) 100%)",
    titleStyle: {
      backgroundImage:
        "linear-gradient(180deg, #F5EA54 0%, #FFBD21 25%, #F5EA54 50%, #C35221 75%, #FC8518 100%)",
      backgroundClip: "text" as const,
      WebkitBackgroundClip: "text" as const,
      color: "transparent",
      WebkitTextFillColor: "transparent",
      filter:
        "drop-shadow(1px 1px 0px #000) drop-shadow(-1px -1px 0px #000) drop-shadow(1px -1px 0px #000) drop-shadow(-1px 1px 0px #000)",
    },
    glowColor: "#FFD819",
    particleColor: "#ffd819",
  },
  orbs: {
    title: "ORBS",
    icon: "/sprites/items/orb/item_orb_01.png",
    bg: "radial-gradient(ellipse at 50% 40%, rgba(10, 30, 80, 0.9) 0%, rgba(5, 12, 40, 0.95) 50%, rgba(0, 0, 0, 1) 100%)",
    titleStyle: {
      backgroundImage:
        "linear-gradient(180deg, #93c5fd 0%, #3b82f6 25%, #93c5fd 50%, #1d4ed8 75%, #2563eb 100%)",
      backgroundClip: "text" as const,
      WebkitBackgroundClip: "text" as const,
      color: "transparent",
      WebkitTextFillColor: "transparent",
      filter:
        "drop-shadow(1px 1px 0px #000) drop-shadow(-1px -1px 0px #000) drop-shadow(1px -1px 0px #000) drop-shadow(-1px 1px 0px #000)",
    },
    glowColor: "#3b82f6",
    particleColor: "#3b82f6",
  },
} as const;

type RevealPhase = "coins" | "orbs";

export function LootRevealOverlay() {
  const lootPhase = useGameStore((s) => s.lootPhase);
  const data = useGameStore((s) => s.gameOverData);
  const advance = useGameStore((s) => s.advanceLootPhase);
  const [animIn, setAnimIn] = useState(false);

  const isRevealPhase =
    lootPhase === "coins" || lootPhase === "orbs";

  // Animate in on phase change
  useEffect(() => {
    if (isRevealPhase) {
      setAnimIn(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimIn(true));
      });
    }
  }, [lootPhase, isRevealPhase]);

  const handleClick = useCallback(() => {
    advance();
  }, [advance]);

  // Keyboard (Enter/Space)
  useEffect(() => {
    if (!isRevealPhase) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isRevealPhase, advance]);

  if (!data || !isRevealPhase) return null;

  const phase = lootPhase as RevealPhase;
  const config = PHASE_CONFIG[phase];
  const { stats } = data;

  const target =
    phase === "coins" ? stats.coinsCollected : stats.orbsCollected;

  const dur =
    phase === "coins"
      ? Math.min(1500, Math.max(500, target * 30))
      : Math.min(1200, Math.max(400, target * 50));

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer select-none transition-opacity duration-500 ${
        animIn ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: config.bg }}
      onClick={handleClick}
    >
      {/* Floating ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`${phase}-${i}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: config.particleColor,
              opacity: 0.3 + Math.random() * 0.4,
              left: `${Math.random() * 100}%`,
              bottom: "-5%",
              animation: `lootFloatUp ${3 + Math.random() * 4}s linear ${
                Math.random() * 3
              }s infinite`,
            }}
          />
        ))}
      </div>

      {/* Title */}
      <h1 className="font-pixel text-4xl sm:text-6xl uppercase mb-8 z-10">
        <span
          className="inline-block"
          style={{
            ...config.titleStyle,
          }}
        >
          {config.title}
        </span>
      </h1>

      {/* Icon (floating) */}
      <img
        src={config.icon}
        alt=""
        className="w-20 h-20 sm:w-24 sm:h-24 z-10 object-contain"
        style={{
          imageRendering: "pixelated",
          filter: `drop-shadow(0 0 12px ${config.glowColor}80)`,
          animation: "lootFloatBounce 2s ease-in-out infinite",
        }}
      />

      {/* Count-up number */}
      <CountUpDisplay
        key={phase}
        target={target}
        duration={dur}
        active={animIn}
        glowColor={config.glowColor}
      />

      {/* TAP ANYWHERE */}
      <div className="absolute bottom-8 z-10">
        <span className="font-pixel text-xs text-white/60 uppercase tracking-widest animate-pulse">
          TAP ANYWHERE
        </span>
      </div>

      {/* CSS keyframes */}
      <style jsx global>{`
        @keyframes lootFloatUp {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.6;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(-110vh) translateX(20px);
            opacity: 0;
          }
        }
        @keyframes lootFloatBounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }
      `}</style>
    </div>
  );
}

function CountUpDisplay({
  target,
  duration,
  active,
  glowColor,
}: {
  target: number;
  duration: number;
  active: boolean;
  glowColor: string;
}) {
  const value = useCountUp(target, duration, active);

  return (
    <div
      className="font-pixel text-6xl sm:text-8xl text-white mt-6 mb-8 z-10"
      style={{
        filter: `drop-shadow(0 0 30px ${glowColor}) drop-shadow(0 0 60px ${glowColor}80)`,
        textShadow: `0 0 40px ${glowColor}cc`,
      }}
    >
      {value}
    </div>
  );
}
