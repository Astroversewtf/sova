"use client";

import { useState, useEffect } from "react";

interface ChestSlotProps {
  chestImage: string;
  unlockTime?: number;
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

/*
  CHEST SLOT — placeholder wireframe matching sketch.
  Replace the border box with chest art/image when ready.
*/
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
      className="flex flex-col items-center gap-1 disabled:opacity-30"
    >
      <div className="w-[clamp(70px,18vw,120px)] h-[clamp(80px,20vw,130px)] border-2 border-white/30 flex flex-col items-center justify-center gap-1">
        <img
          src={chestImage}
          alt="Chest"
          className={`w-[60%] h-auto object-contain ${isReady ? "animate-run-end-chest-shake" : ""}`}
          style={{ imageRendering: "pixelated" }}
        />
        <span className="font-press-start text-[clamp(5px,1.2vw,8px)] text-white/50 leading-none">
          chest
        </span>
      </div>

      {hasChest && remaining != null && (
        <span
          className={`font-press-start text-[7px] ${
            isReady ? "text-green-400/80" : "text-yellow-300/60"
          }`}
        >
          {formatTime(remaining)}
        </span>
      )}
    </button>
  );
}
