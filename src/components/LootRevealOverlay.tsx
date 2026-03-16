"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "@/stores/gameStore";
import { usePlayerStore } from "@/stores/playerStore";

type RevealStage = "intro" | "closed" | "opening" | "reveal" | "summary";

type RewardItem = {
  key: "coin" | "orb" | "ticket";
  label: string;
  icon: string;
  amount: number;
  accent: string;
  cardGlow: string;
};

const OUTLINE =
  "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 -2px 0 #000, 0 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000";

export function LootRevealOverlay() {
  const lootPhase = useGameStore((s) => s.lootPhase);
  const data = useGameStore((s) => s.gameOverData);
  const keysUsed = useGameStore((s) => s.keysUsed);
  const walletAddress = usePlayerStore((s) => s.walletAddress);
  const [mounted, setMounted] = useState(false);
  const [animIn, setAnimIn] = useState(false);
  const [stage, setStage] = useState<RevealStage>("intro");
  const [revealedCount, setRevealedCount] = useState(0);
  const openingTimerRef = useRef<number | null>(null);
  const finishingRef = useRef(false);

  const isActive = lootPhase === "coins" && !!data;

  const rewards = useMemo<RewardItem[]>(() => {
    if (!data) return [];
    const list: RewardItem[] = [
      {
        key: "coin" as const,
        label: "COINS",
        icon: "/sprites/items/coin/coin_01.png",
        amount: data.stats.coinsCollected,
        accent: "#ffdf75",
        cardGlow: "0 0 24px rgba(255,223,117,0.35)",
      },
      {
        key: "orb" as const,
        label: "ORBS",
        icon: "/sprites/items/orb/item_orb_01.png",
        amount: data.stats.orbsCollected,
        accent: "#7fd2ff",
        cardGlow: "0 0 24px rgba(127,210,255,0.35)",
      },
      {
        key: "ticket" as const,
        label: "TICKETS",
        icon: "/sprites/items/golden_ticket/golden_ticket_big_01.png",
        amount: data.stats.goldenTicketsCollected,
        accent: "#ffb974",
        cardGlow: "0 0 24px rgba(255,185,116,0.35)",
      },
    ].filter((item) => item.amount > 0);

    return list.length > 0
      ? list
      : [
          {
            key: "coin" as const,
            label: "COINS",
            icon: "/sprites/items/coin/coin_01.png",
            amount: 0,
            accent: "#ffdf75",
            cardGlow: "0 0 24px rgba(255,223,117,0.2)",
          },
        ];
  }, [data]);

  const currentIndex = Math.min(Math.max(revealedCount - 1, 0), rewards.length - 1);
  const currentReward = rewards[currentIndex];

  const goToLobby = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    if (walletAddress && data) {
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
        if (res.ok) {
          const result = await res.json();
          usePlayerStore.setState({
            coins: result.coins,
            gems: result.gems,
            goldenTickets: result.goldenTickets,
            bestScore: result.bestScore,
            weeklyScore: result.weeklyScore,
          });
        }
      } catch (err) {
        console.error("Failed to submit run", err);
      }
    }

    useGameStore.getState().endRun();
    window.dispatchEvent(
      new CustomEvent("sova:run-end-action", { detail: "lobby" }),
    );
  }, [data, keysUsed, walletAddress]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (openingTimerRef.current !== null) {
      window.clearTimeout(openingTimerRef.current);
      openingTimerRef.current = null;
    }

    if (!isActive) {
      setAnimIn(false);
      setStage("intro");
      setRevealedCount(0);
      return;
    }

    setStage("intro");
    setRevealedCount(0);
    setAnimIn(false);
    requestAnimationFrame(() => setAnimIn(true));
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (openingTimerRef.current !== null) {
        window.clearTimeout(openingTimerRef.current);
      }
    };
  }, []);

  const handleAdvance = useCallback(() => {
    if (!isActive) return;

    if (stage === "intro") {
      setStage("closed");
      return;
    }

    if (stage === "closed") {
      setStage("opening");
      openingTimerRef.current = window.setTimeout(() => {
        setStage("reveal");
        setRevealedCount(1);
      }, 480);
      return;
    }

    if (stage === "opening") return;

    if (stage === "reveal") {
      if (revealedCount < rewards.length) {
        setRevealedCount((n) => n + 1);
        return;
      }
      setStage("summary");
      return;
    }

    if (stage === "summary") {
      setAnimIn(false);
      window.setTimeout(() => {
        void goToLobby();
      }, 120);
    }
  }, [goToLobby, isActive, revealedCount, rewards.length, stage]);

  useEffect(() => {
    if (!isActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleAdvance, isActive]);

  if (!mounted || !isActive) return null;

  const isChestUp = stage === "summary";
  const chestSrc =
    stage === "closed" || stage === "opening"
      ? "/images/run-end/chest-open.png"
      : "/images/run-end/chest-closed.png";
  const bottomHint =
    stage === "intro"
      ? "CLICK TO CONTINUE"
      : stage === "closed"
      ? "CLICK TO OPEN"
      : stage === "opening"
      ? "OPENING..."
      : stage === "reveal"
      ? revealedCount < rewards.length
        ? "CLICK FOR NEXT REWARD"
        : "CLICK TO SHOW ALL"
      : "CLICK TO CONTINUE";

  return createPortal(
    <div
      className={`fixed inset-0 z-[70] select-none cursor-pointer transition-opacity duration-200 ${
        animIn ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: "rgba(0,0,0,0.97)" }}
      onClick={handleAdvance}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
        {stage === "intro" && (
          <h1
            className="font-pixel text-[56px] sm:text-[92px] text-white leading-none tracking-wide"
            style={{ textShadow: OUTLINE }}
          >
            GAME OVER
          </h1>
        )}

        {stage !== "intro" && (
          <>
            <img
              src={chestSrc}
              alt=""
              className={`absolute z-10 transition-all duration-[450ms] ease-out object-contain ${
                isChestUp
                  ? "top-[15%] w-[180px] h-[180px] sm:w-[230px] sm:h-[230px]"
                  : "top-[58%] -translate-y-1/2 w-[240px] h-[240px] sm:w-[320px] sm:h-[320px]"
              } ${
                stage === "opening" || stage === "reveal"
                  ? "animate-run-end-chest-shake"
                  : stage === "closed"
                  ? "animate-run-end-chest-bounce"
                  : ""
              }`}
              style={{ imageRendering: "pixelated" }}
            />

            {stage === "reveal" && (
              <div className="absolute z-20 left-1/2 top-[31%] -translate-x-1/2 flex items-center gap-3 sm:gap-4">
                <img
                  src={currentReward.icon}
                  alt=""
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
                <div
                  className="font-press-start-crisp text-[40px] sm:text-[52px] leading-none text-gray-300"
                >
                  {currentReward.amount}
                </div>
              </div>
            )}

            {stage === "summary" && (
              <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 sm:gap-4">
                {rewards.map((item) => (
                  <RewardCard key={item.key} item={item} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-hint-blink">
        <span className="font-press-start text-[10px] text-white/72 tracking-wide">
          {bottomHint}
        </span>
      </div>
    </div>,
    document.body,
  );
}

function RewardCard({ item, large = false }: { item: RewardItem; large?: boolean }) {
  return (
    <div
      className={`rounded-[10px] border border-white/20 bg-[#16243c] flex items-center ${
        large ? "w-[230px] h-[130px] sm:w-[280px] sm:h-[150px] px-5" : "w-[102px] h-[112px] sm:w-[114px] sm:h-[122px] px-3"
      }`}
      style={{ boxShadow: item.cardGlow }}
    >
      <div className="flex w-full flex-col items-center justify-center">
        <img
          src={item.icon}
          alt=""
          className={`${large ? "w-14 h-14 sm:w-16 sm:h-16 mb-3" : "w-8 h-8 sm:w-9 sm:h-9 mb-2"} object-contain`}
          style={{ imageRendering: "pixelated" }}
        />
        <div className="font-pixel text-white text-[13px] sm:text-[14px] leading-none mb-1">
          {item.label}
        </div>
        <div
          className={`${large ? "font-pixel text-[42px] sm:text-[48px]" : "font-pixel text-[26px] sm:text-[29px]"} leading-none`}
          style={{ color: item.accent, textShadow: OUTLINE }}
        >
          {item.amount}
        </div>
      </div>
    </div>
  );
}
