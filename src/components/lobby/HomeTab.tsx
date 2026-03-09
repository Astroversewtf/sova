"use client";

import { useState, useEffect } from "react";
import { useWalletStore } from "@/stores/walletStore";
import { usePlayerStore } from "@/stores/playerStore";
import { useGameStore } from "@/stores/gameStore";
import { useLobbyStore } from "@/stores/lobbyStore";
import { OverlayFrame } from "@/components/OverlayFrame";

const MAX_KEYS = 15;

export function HomeTab() {
  const setView = useWalletStore((s) => s.setView);
  const keys = usePlayerStore((s) => s.keys);
  const [keysToUse, setKeysToUse] = useState(1);
  const keyPickerOpen = useLobbyStore((s) => s.keyPickerOpen);

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

  if (!keyPickerOpen) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-end justify-center pb-[100px]">
        <div className="flex flex-col items-center gap-3">
          <span className="font-pixel text-xs text-white text-outline uppercase">
            KEYS TO PLAY
          </span>

          {/* +5  +10  MAX */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setClampedKeys(keysToUse + 5)}>
              <img
                src="/sprites/ui/buttons/buttons_five_01.png"
                alt="+5"
                className="h-10 w-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </button>
            <button type="button" onClick={() => setClampedKeys(keysToUse + 10)}>
              <img
                src="/sprites/ui/buttons/buttons_ten_01.png"
                alt="+10"
                className="h-10 w-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </button>
            <button type="button" onClick={() => setClampedKeys(effectiveMaxKeys)}>
              <img
                src="/sprites/ui/buttons/buttons_max_01.png"
                alt="MAX"
                className="h-10 w-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </button>
          </div>

          {/* -  [key + count]  + */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setClampedKeys(keysToUse - 1)}>
              <img
                src="/sprites/ui/buttons/buttons_minus_01.png"
                alt="-"
                className="h-12 w-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </button>

            <OverlayFrame
              className="h-12 min-w-[180px]"
              contentClassName="flex items-center justify-center gap-3 !p-0"
              namePrefix="square"
              edge={16}
              innerEdge={16}
            >
              <img
                src="/sprites/items/key/key_02.png"
                alt=""
                className="w-6 h-6"
                style={{ imageRendering: "pixelated" }}
              />
              <span className="font-press-start text-xl text-white text-outline">{keysToUse}</span>
            </OverlayFrame>

            <button type="button" onClick={() => setClampedKeys(keysToUse + 1)}>
              <img
                src="/sprites/ui/buttons/buttons_plus_01.png"
                alt="+"
                className="h-12 w-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </button>
          </div>

          {keys < keysToUse && (
            <p className="text-center font-pixel text-[10px] text-[#9fb0c3] text-outline">
              NOT ENOUGH KEYS
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
