"use client";

import { useState } from "react";
import { useWalletStore } from "@/stores/walletStore";
import { usePlayerStore } from "@/stores/playerStore";
import { useGameStore } from "@/stores/gameStore";

const MAX_KEYS = 15;

export function HomeTab() {
  const setView = useWalletStore((s) => s.setView);
  const keys = usePlayerStore((s) => s.keys);
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

  return (
    <div className="h-full p-6 flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[760px] flex flex-col items-center gap-6">
          <div className="w-full max-w-[620px] rounded-md border border-[#2e3f52] bg-[#111a26] p-4">
            <div className="font-pixel text-sm text-white text-outline text-center uppercase">
              KEYS TO PLAY
            </div>

            <div className="mt-4 flex items-center justify-center gap-3">
              {[5, 10].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setClampedKeys(keysToUse + n)}
                  className="h-14 min-w-[110px] rounded-xl border border-[#3f566f] bg-[#253548] px-4 font-press-start text-lg text-[#6fb6ff] text-outline hover:bg-[#2f435b] transition-colors"
                >
                  +{n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setClampedKeys(effectiveMaxKeys)}
                className="h-14 min-w-[110px] rounded-xl border border-[#3f566f] bg-[#253548] px-4 font-press-start text-lg text-[#6fb6ff] text-outline hover:bg-[#2f435b] transition-colors"
              >
                MAX
              </button>
            </div>

            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setClampedKeys(keysToUse - 1)}
                className="h-20 w-20 rounded-2xl border border-[#3f566f] bg-[#233245] font-press-start text-3xl leading-none text-[#6fb6ff] text-outline hover:bg-[#2c4058] transition-colors"
              >
                -
              </button>

              <div className="h-20 min-w-[320px] rounded-2xl border border-[#2d4f74] bg-[#0c1d2f] px-6 flex items-center justify-center gap-4">
                <img
                  src="/sprites/items/key/key_02.png"
                  alt=""
                  className="w-8 h-8"
                  style={{ imageRendering: "pixelated" }}
                />
                <span className="font-press-start text-3xl text-white text-outline">{keysToUse}</span>
              </div>

              <button
                type="button"
                onClick={() => setClampedKeys(keysToUse + 1)}
                className="h-20 w-20 rounded-2xl border border-[#3f566f] bg-[#233245] font-press-start text-3xl leading-none text-[#6fb6ff] text-outline hover:bg-[#2c4058] transition-colors"
              >
                +
              </button>
            </div>

            {keys < keysToUse && (
              <p className="mt-3 text-center font-pixel text-[10px] text-[#9fb0c3] text-outline">
                NOT ENOUGH KEYS
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pb-2 flex justify-center">
        <button
          onClick={handlePlay}
          disabled={!canPlay}
          className={`relative w-[min(250px,36vw)] ${canPlay ? "cursor-pointer" : "cursor-not-allowed"}`}
          aria-label={canPlay ? "Play" : "No keys"}
        >
          <img
            src="/sprites/ui/buttons/buttons_play_01.png"
            alt=""
            className="w-full h-auto"
            style={{ imageRendering: "pixelated" }}
          />
        </button>
      </div>
    </div>
  );
}
