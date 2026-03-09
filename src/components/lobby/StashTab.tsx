"use client";

import { usePlayerStore } from "@/stores/playerStore";
import { OverlayFrame } from "@/components/OverlayFrame";

export function StashTab() {
  const { totalEarnings, weeklyEarnings, jackpotEarnings } = usePlayerStore();

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 w-full max-w-[400px]">
          <span className="font-pixel text-xs text-white text-outline uppercase">
            EARNINGS
          </span>

          {/* Total */}
          <OverlayFrame
            className="w-full h-16"
            contentClassName="flex flex-col items-center justify-center !p-0"
            namePrefix="square"
            edge={16}
            innerEdge={16}
          >
            <span className="font-pixel text-[9px] text-[#b4c0cf] uppercase text-outline">
              TOTAL EARNINGS
            </span>
            <span className="font-press-start text-lg text-white text-outline">
              {totalEarnings.toFixed(2)} AVAX
            </span>
          </OverlayFrame>

          {/* Weekly + Jackpot side by side */}
          <div className="w-full flex gap-2">
            <OverlayFrame
              className="flex-1 h-14"
              contentClassName="flex flex-col items-center justify-center !p-0"
              namePrefix="square"
              edge={16}
              innerEdge={16}
            >
              <span className="font-pixel text-[9px] text-[#6fb6ff] uppercase text-outline">
                WEEKLY
              </span>
              <span className="font-press-start text-xs text-white text-outline">
                {weeklyEarnings.toFixed(2)}
              </span>
            </OverlayFrame>

            <OverlayFrame
              className="flex-1 h-14"
              contentClassName="flex flex-col items-center justify-center !p-0"
              namePrefix="square"
              edge={16}
              innerEdge={16}
            >
              <span className="font-pixel text-[9px] text-[#ff7ac7] uppercase text-outline">
                JACKPOT
              </span>
              <span className="font-press-start text-xs text-white text-outline">
                {jackpotEarnings.toFixed(2)}
              </span>
            </OverlayFrame>
          </div>

        </div>
      </div>
    </div>
  );
}
