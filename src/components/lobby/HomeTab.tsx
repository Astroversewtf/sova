"use client";

import { useState } from "react";
import { useWalletStore } from "@/stores/walletStore";
import { usePlayerStore } from "@/stores/playerStore";
import { useGameStore } from "@/stores/gameStore";

const MAX_KEYS = 5;

export function HomeTab() {
  const setView = useWalletStore((s) => s.setView);
  const keys = usePlayerStore((s) => s.keys);
  const [keysToUse, setKeysToUse] = useState(1);

  const walletAddress = usePlayerStore((s) => s.walletAddress);
  const [starting, setStarting] = useState(false);
  const canPlay = keys >= keysToUse && !starting;

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

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="flex flex-col items-center gap-6">
        {/* Key selector */}
        <div className="flex flex-col items-center gap-2">
          <span className="font-pixel text-[10px] text-gray-400 uppercase text-outline">
            Keys to wager
          </span>
          <div className="flex items-center gap-2">
            {Array.from({ length: MAX_KEYS }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setKeysToUse(n)}
                disabled={keys < n}
                className={`font-pixel text-[12px] w-9 h-9 rounded transition-all ${
                  keysToUse === n
                    ? "bg-cyan-500 text-white shadow-[0_2px_0_#0e7490]"
                    : keys < n
                      ? "bg-black/30 text-gray-600 cursor-not-allowed border border-white/5"
                      : "bg-black/30 text-gray-300 hover:bg-white/10 border border-white/10 cursor-pointer"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Guide button */}
          <button className="bg-amber-400 hover:bg-amber-300 text-white font-pixel text-xl px-12 py-6 rounded-lg border-2 border-amber-500/50 shadow-[0_4px_0_#b45309] hover:shadow-[0_2px_0_#b45309] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all text-outline">
            GUIDE
          </button>

          {/* Play button */}
          <button
            onClick={handlePlay}
            disabled={!canPlay}
            className={`font-pixel text-xl px-16 py-6 rounded-lg border-2 transition-all text-outline ${
              canPlay
                ? "bg-[#b8e550] hover:bg-[#c5ed65] text-white border-[#a0cc40]/50 shadow-[0_4px_0_#7a9e30] hover:shadow-[0_2px_0_#7a9e30] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] animate-play-pulse cursor-pointer"
                : "bg-gray-600 text-gray-400 border-gray-500/50 shadow-[0_4px_0_#374151] cursor-not-allowed"
            }`}
          >
            {canPlay ? "PLAY" : "NO KEYS"}
          </button>
        </div>
      </div>
    </div>
  );
}
