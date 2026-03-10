"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "@/stores/gameStore";
import { usePlayerStore } from "@/stores/playerStore";
import { OverlayFrame } from "./OverlayFrame";

const OUTLINE =
  "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 -2px 0 #000, 0 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000";

export function GameOverOverlay() {
  const data = useGameStore((s) => s.gameOverData);
  const lootPhase = useGameStore((s) => s.lootPhase);
  const keysUsed = useGameStore((s) => s.keysUsed);
  const walletAddress = usePlayerStore((s) => s.walletAddress);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [runSubmitted, setRunSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if(!data || !walletAddress || runSubmitted) return;
    setRunSubmitted(true);

    fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: walletAddress,
        stats: data.stats,
        floor: data.floor,
        keysUsed
      })
    })
    .then((res) => (res.ok ? res.json() : null))
    .then((result) => {
      if(result) {
        usePlayerStore.setState({
          coins: result.coins,
          gems: result.gems,
          goldenTickets: result.goldenTickets,
          bestScore: result.bestScore,
          weeklyScore: result.weeklyScore
        });
      }
    })
    .catch((err) => console.error("Failed to submit run", err));
  }, [data, walletAddress, keysUsed]);


  useEffect(() => {
    if (lootPhase !== "summary" || !data) {
      setVisible(false);
      return;
    }
    requestAnimationFrame(() => setVisible(true));
  }, [lootPhase, data]);

  useEffect(() => {
    if (!data) setRunSubmitted(false);
  }, [data]);

  if (!mounted || !data || lootPhase !== "summary") return null;

  const { stats, floor } = data;

  const handlePlayAgain = () => {
    useGameStore.getState().endRun();
    window.dispatchEvent(
      new CustomEvent("sova:run-end-action", { detail: "play-again" }),
    );
  };

  const handleLobby = () => {
    useGameStore.getState().endRun();
    window.dispatchEvent(
      new CustomEvent("sova:run-end-action", { detail: "lobby" }),
    );
  };

  const overlay = (
    <div
      className={`fixed inset-0 z-[75] flex items-center justify-center px-4 py-5 transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ background: "rgba(0, 0, 0, 0.92)" }}
    >
      <OverlayFrame
        className="w-[min(430px,88vw)] h-[min(620px,84vh)]"
        contentClassName="h-full w-full"
        edge={64}
      >
        <div
          className="relative flex h-full w-full flex-col select-none"
          style={{ backgroundColor: "#3d4139" }}
        >
          <h1
            className="mt-5 text-center font-pixel text-[40px] sm:text-[50px] text-white leading-none tracking-wide"
            style={{ textShadow: OUTLINE }}
          >
            GAME OVER
          </h1>

          <div className="mt-6 flex items-center justify-center gap-2">
            <SimpleLoot icon="/sprites/items/coin/coin_01.png" value={stats.coinsCollected} valueClassName="text-[#ffdf75]" />
            <SimpleLoot icon="/sprites/items/golden_ticket/golden_ticket_big_01.png" value={stats.goldenTicketsCollected} valueClassName="text-[#f87171]" />
            <SimpleLoot icon="/sprites/items/orb/item_orb_01.png" value={stats.orbsCollected} valueClassName="text-[#6fb6ff]" />
          </div>

          <div className="mt-7 px-3">
            <div className="font-press-start-crisp text-[9px] sm:text-[10px] text-gray-200 text-center leading-[1.8]">
              <span style={{ textShadow: OUTLINE }}>
                FLOOR {floor}F · KILLS {stats.enemiesKilled} · BOSSES {stats.bossesKilled}
              </span>
              <br />
              <span style={{ textShadow: OUTLINE }}>
                CHESTS {stats.chestsOpened} · TRAPS {stats.trapsTriggered} · UPGRADES {stats.upgradesTaken.length}
              </span>
            </div>
          </div>

          <div className="mt-auto pt-7 pb-2 flex flex-col items-center justify-center gap-2">
            <ActionButton
              image="/sprites/ui/run-end/buttons_play_01.png"
              onClick={handlePlayAgain}
              widthClassName="w-[220px]"
            />
            <ActionButton
              image="/sprites/ui/run-end/buttons_menu_01.png"
              onClick={handleLobby}
              widthClassName="w-[220px]"
            />
          </div>
        </div>
      </OverlayFrame>
    </div>
  );

  return createPortal(overlay, document.body);
}

function SimpleLoot({
  icon,
  value,
  valueClassName,
}: {
  icon: string;
  value: number;
  valueClassName: string;
}) {
  return (
    <div className="relative w-[110px] h-[84px] flex flex-col items-center justify-center gap-1">
      <img
        src={icon}
        alt=""
        className="w-8 h-8"
        style={{ imageRendering: "pixelated" }}
      />
      <span
        className={`font-press-start-crisp text-[17px] leading-none ${valueClassName}`}
        style={{ textShadow: OUTLINE }}
      >
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  image,
  onClick,
  widthClassName,
}: {
  image: string;
  onClick: () => void;
  widthClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group pointer-events-auto relative ${widthClassName} cursor-pointer`}
    >
      <img
        src={image}
        alt=""
        className="w-full h-auto transition-transform duration-120 group-hover:scale-[0.97] group-active:scale-[0.94]"
        style={{ imageRendering: "pixelated" }}
      />
    </button>
  );
}
