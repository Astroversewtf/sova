"use client";

import { useState, useEffect } from "react";
import { OverlayFrame } from "@/components/OverlayFrame";

interface ChestSlotProps {
  chestImage: string;
  unlockTime?: number; // timestamp when chest unlocks, undefined = empty slot
  onOpen?: () => void;
}

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

export function ChestSlot({ chestImage, unlockTime, onOpen }: ChestSlotProps) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!unlockTime) return;
    const tick = () => setRemaining(Math.max(0, unlockTime - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [unlockTime]);

  const isReady = unlockTime != null && remaining != null && remaining <= 0;
  const hasChest = unlockTime != null;

  return (
    <button
      type="button"
      onClick={hasChest ? onOpen : undefined}
      disabled={!hasChest}
      className="relative flex flex-col items-center gap-1 disabled:opacity-40"
    >
      <OverlayFrame
        className="w-[clamp(70px,18vw,100px)] h-[clamp(70px,18vw,100px)]"
        contentClassName="flex items-center justify-center !p-0"
        namePrefix="square"
        edge={16}
        innerEdge={16}
      >
        {hasChest ? (
          <img
            src={chestImage}
            alt="Chest"
            className={`w-[75%] h-[75%] object-contain ${isReady ? "animate-run-end-chest-shake" : ""}`}
            style={{ imageRendering: "pixelated" }}
          />
        ) : (
          <span className="font-pixel text-[8px] text-white/30 text-outline">EMPTY</span>
        )}
      </OverlayFrame>

      {hasChest && remaining != null && (
        <span
          className={`font-press-start text-[7px] text-outline ${
            isReady ? "text-[#7fff7f]" : "text-[#ffdf75]"
          }`}
        >
          {formatTime(remaining)}
        </span>
      )}
    </button>
  );
}
