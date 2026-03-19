"use client";

import { usePlayerStore } from "@/stores/playerStore";

/*
  STASH TAB — placeholder wireframe matching sketch (page 2).
  Layout: [TOTAL EARNINGS] label, [value] box, [weekly pool] + [jackpot] side by side.
  Replace border boxes with themed art when ready.
*/
export function StashTab() {
  const { totalEarnings, weeklyEarnings, jackpotEarnings } = usePlayerStore();

  return (
    <div className="h-full flex flex-col items-center justify-center px-2">
      <div className="w-full max-w-[500px] flex flex-col items-center gap-4 sm:gap-6">
        {/* Total Earnings label */}
        <div className="w-full max-w-[320px] sm:max-w-[360px] border-2 border-white/30 py-4 sm:py-5 flex flex-col items-center gap-1">
          <span className="font-press-start text-[clamp(7px,1.6vw,11px)] text-white/50">TOTAL EARNINGS</span>
        </div>

        {/* Earnings value */}
        <div className="w-full max-w-[320px] sm:max-w-[360px] border-2 border-white/30 py-5 sm:py-6 flex items-center justify-center">
          <span className="font-press-start text-[clamp(12px,3vw,20px)] text-white/70">
            {totalEarnings.toFixed(4)} AVAX
          </span>
        </div>

        {/* Weekly Pool + Jackpot side by side */}
        <div className="w-full flex gap-3 sm:gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <div className="border-2 border-white/30 py-2 sm:py-3 flex items-center justify-center">
              <span className="font-press-start text-[clamp(6px,1.3vw,9px)] text-white/50">weekly pool</span>
            </div>
            <div className="border-2 border-white/30 py-4 sm:py-6 flex items-center justify-center">
              <span className="font-press-start text-[clamp(9px,2vw,14px)] text-white/60">
                {weeklyEarnings.toFixed(4)}
              </span>
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="border-2 border-white/30 py-2 sm:py-3 flex items-center justify-center">
              <span className="font-press-start text-[clamp(6px,1.3vw,9px)] text-white/50">jackpot</span>
            </div>
            <div className="border-2 border-white/30 py-4 sm:py-6 flex items-center justify-center">
              <span className="font-press-start text-[clamp(9px,2vw,14px)] text-white/60">
                {jackpotEarnings.toFixed(4)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
