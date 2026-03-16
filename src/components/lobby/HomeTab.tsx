"use client";

import { useState, useEffect } from "react";
import { useWalletStore } from "@/stores/walletStore";
import { usePlayerStore } from "@/stores/playerStore";
import { useGameStore } from "@/stores/gameStore";
import { useLobbyStore } from "@/stores/lobbyStore";
import { OverlayFrame } from "@/components/OverlayFrame";
import { ChestSlot } from "@/components/lobby/ChestSlot";
import { ChestPopup } from "@/components/lobby/ChestPopup";

const MAX_KEYS = 15;
const CHEST_IMAGE = "/sprites/props/chest_wood_01.png";

// Placeholder chest data — replace with real data from backend later
const PLACEHOLDER_CHESTS = [
  { id: 0, unlockTime: Date.now() + 2 * 60 * 60 * 1000 },
  { id: 1, unlockTime: Date.now() + 30 * 60 * 1000 },
  { id: 2, unlockTime: undefined as number | undefined },
  { id: 3, unlockTime: undefined as number | undefined },
];

function formatTime(ms: number): string {
  if (ms <= 0) return "READY";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function RewardCard({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <OverlayFrame
      className="w-[clamp(64px,18vw,120px)] h-[clamp(64px,18vw,120px)]"
      contentClassName="flex flex-col items-center justify-center gap-0.5 !p-0"
      edge={32}
      innerEdge={32}
    >
      <img
        src={icon}
        alt={label}
        className="w-7 h-7 sm:w-10 sm:h-10"
        style={{ imageRendering: "pixelated" }}
      />
      <span className="font-press-start text-[clamp(5px,1.4vw,8px)] text-outline uppercase" style={{ color }}>
        {label}
      </span>
    </OverlayFrame>
  );
}

function KeyPicker() {
  const setView = useWalletStore((s) => s.setView);
  const keys = usePlayerStore((s) => s.keys);
  const setKeyPickerOpen = useLobbyStore((s) => s.setKeyPickerOpen);
  const [keysToUse, setKeysToUse] = useState(1);
  const walletAddress = usePlayerStore((s) => s.walletAddress);
  const [starting, setStarting] = useState(false);
  const canPlay = keys >= keysToUse && !starting;
  const effectiveMaxKeys = Math.min(MAX_KEYS, Math.max(1, keys));

  function setClampedKeys(next: number) {
    setKeysToUse(Math.max(1, Math.min(MAX_KEYS, next)));
  }

  const handlePlay = async () => {
    if (!canPlay || !walletAddress) return;
    setStarting(true);
    try {
      const res = await fetch("/api/run/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress, keysUsed: keysToUse }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to start run:", data.error);
        if (data.keys !== undefined) usePlayerStore.setState({ keys: data.keys });
        return;
      }
      usePlayerStore.setState({ keys: data.keysRemaining });
      useGameStore.getState().startRun(data.keysUsed);
      setView("game");
    } catch (err) {
      console.error("Failed to start run", err);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    const onPlay = () => handlePlay();
    window.addEventListener("sova:request-play", onPlay);
    return () => window.removeEventListener("sova:request-play", onPlay);
  });

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3">
      {/* Back button */}
      <button
        type="button"
        onClick={() => setKeyPickerOpen(false)}
        className="self-center mb-1 sm:mb-3"
      >
        <span className="font-pixel text-[9px] sm:text-[10px] text-white/60 text-outline uppercase">
          BACK
        </span>
      </button>

      {/* Reward preview cards */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-4">
        <RewardCard icon="/sprites/items/coin/coin_01.png" label="COIN" color="#ffdf75" />
        <RewardCard icon="/sprites/items/golden_ticket/golden_ticket_01.png" label="JACKPOT" color="#ff7ac7" />
        <RewardCard icon="/sprites/items/orb/item_orb_01.png" label="ORB" color="#7f9dc4" />
      </div>

      {/* Key selector */}
      <div className="flex flex-col items-center gap-2 sm:gap-3">
        <span className="font-pixel text-[10px] sm:text-xs text-white text-outline uppercase">
          KEYS TO PLAY
        </span>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button type="button" onClick={() => setClampedKeys(keysToUse + 5)}>
            <img src="/sprites/ui/buttons/buttons_five_01.png" alt="+5" className="h-8 sm:h-10 w-auto" style={{ imageRendering: "pixelated" }} />
          </button>
          <button type="button" onClick={() => setClampedKeys(keysToUse + 10)}>
            <img src="/sprites/ui/buttons/buttons_ten_01.png" alt="+10" className="h-8 sm:h-10 w-auto" style={{ imageRendering: "pixelated" }} />
          </button>
          <button type="button" onClick={() => setClampedKeys(effectiveMaxKeys)}>
            <img src="/sprites/ui/buttons/buttons_max_01.png" alt="MAX" className="h-8 sm:h-10 w-auto" style={{ imageRendering: "pixelated" }} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button type="button" onClick={() => setClampedKeys(keysToUse - 1)}>
            <img src="/sprites/ui/buttons/buttons_minus_01.png" alt="-" className="h-10 sm:h-12 w-auto" style={{ imageRendering: "pixelated" }} />
          </button>

          <OverlayFrame
            className="h-10 sm:h-12 min-w-[140px] sm:min-w-[180px]"
            contentClassName="flex items-center justify-center gap-2 sm:gap-3 !p-0"
            namePrefix="square"
            edge={16}
            innerEdge={16}
          >
            <img src="/sprites/items/key/key_02.png" alt="" className="w-5 h-5 sm:w-6 sm:h-6" style={{ imageRendering: "pixelated" }} />
            <span className="font-press-start text-lg sm:text-xl text-white text-outline">{keysToUse}</span>
          </OverlayFrame>

          <button type="button" onClick={() => setClampedKeys(keysToUse + 1)}>
            <img src="/sprites/ui/buttons/buttons_plus_01.png" alt="+" className="h-10 sm:h-12 w-auto" style={{ imageRendering: "pixelated" }} />
          </button>
        </div>

        {keys < keysToUse && (
          <p className="text-center font-pixel text-[9px] sm:text-[10px] text-[#9fb0c3] text-outline">
            NOT ENOUGH KEYS
          </p>
        )}
      </div>
    </div>
  );
}

export function HomeTab() {
  const keyPickerOpen = useLobbyStore((s) => s.keyPickerOpen);
  const [selectedChest, setSelectedChest] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const selectedData = selectedChest != null ? PLACEHOLDER_CHESTS[selectedChest] : null;
  const selectedRemaining = selectedData?.unlockTime ? Math.max(0, selectedData.unlockTime - now) : 0;

  if (keyPickerOpen) {
    return (
      <div className="h-full flex flex-col justify-center">
        <KeyPicker />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 sm:gap-6">
        {/* News placeholder */}
        <OverlayFrame
          className="w-full max-w-[500px] h-[80px] sm:h-[100px]"
          contentClassName="flex items-center justify-center !p-0"
          edge={32}
          innerEdge={32}
        >
          <span className="font-pixel text-[9px] sm:text-[10px] text-white/40 text-outline uppercase">
            NEWS
          </span>
        </OverlayFrame>
      </div>

      {/* Chest slots */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 pb-16 sm:pb-20">
        {PLACEHOLDER_CHESTS.map((chest) => (
          <ChestSlot
            key={chest.id}
            chestImage={CHEST_IMAGE}
            unlockTime={chest.unlockTime}
            onOpen={() => setSelectedChest(chest.id)}
          />
        ))}
      </div>

      {/* Chest popup */}
      {selectedChest != null && selectedData && selectedData.unlockTime != null && (
        <ChestPopup
          chestImage={CHEST_IMAGE}
          timeLabel={formatTime(selectedRemaining)}
          isReady={selectedRemaining <= 0}
          onClose={() => setSelectedChest(null)}
          onOpen={() => {
            console.log("Opening chest", selectedChest);
            setSelectedChest(null);
          }}
        />
      )}
    </div>
  );
}
