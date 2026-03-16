"use client";

import { OverlayFrame } from "@/components/OverlayFrame";
import { OverlayTitlePill } from "@/components/OverlayTitlePill";

interface ChestPopupProps {
  chestImage: string;
  timeLabel: string;
  isReady: boolean;
  onClose: () => void;
  onOpen?: () => void;
}

export function ChestPopup({ chestImage, timeLabel, isReady, onClose, onOpen }: ChestPopupProps) {
  return (
    <div
      className="fixed inset-0 z-[130] bg-black/72 backdrop-blur-[3px] flex items-center justify-center px-4 py-6"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <OverlayFrame
          className="w-[min(360px,85vw)] h-auto"
          contentClassName="flex flex-col items-center gap-4 py-6 px-4"
          edge={64}
        >
          <OverlayTitlePill
            title="CHEST"
            className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-[72%]"
            width="min(200px,60%)"
          />

          <img
            src={chestImage}
            alt="Chest"
            className="w-[120px] h-[120px] object-contain mt-4"
            style={{ imageRendering: "pixelated" }}
          />

          <span
            className={`font-press-start text-sm text-outline ${
              isReady ? "text-[#7fff7f]" : "text-[#ffdf75]"
            }`}
          >
            {timeLabel}
          </span>

          {isReady ? (
            <button
              type="button"
              onClick={onOpen}
              className="mt-2"
            >
              <div className="bg-[#4ade80]/20 border-2 border-[#4ade80] rounded px-8 py-2">
                <span className="font-press-start text-xs text-[#7fff7f] text-outline uppercase">
                  OPEN
                </span>
              </div>
            </button>
          ) : (
            <p className="font-pixel text-[10px] text-white/60 text-outline text-center">
              WAIT FOR THE TIMER TO FINISH
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-1"
          >
            <span className="font-pixel text-[10px] text-white/40 text-outline uppercase">
              CLOSE
            </span>
          </button>
        </OverlayFrame>
      </div>
    </div>
  );
}
