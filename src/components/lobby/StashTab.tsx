"use client";

import { usePlayerStore } from "@/stores/playerStore";

export function StashTab() {
  const { totalEarnings, weeklyEarnings, jackpotEarnings } = usePlayerStore();

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-[760px] space-y-4">
        <h3 className="font-pixel text-sm text-white uppercase text-outline">EARNINGS</h3>

        <div className="rounded-md border border-[#3b4652] bg-[#0f1722] p-4 text-center">
          <span className="font-pixel text-[10px] text-[#b4c0cf] uppercase text-outline">
            TOTAL EARNINGS
          </span>
          <div className="mt-1 font-press-start text-2xl text-white text-outline">
            {totalEarnings.toFixed(2)} AVAX
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-md border border-[#32506f] bg-[#0e1c2b] p-3">
            <span className="font-pixel text-[9px] text-[#6fb6ff] uppercase text-outline">WEEKLY</span>
            <div className="mt-1 font-press-start text-sm text-white text-outline">
              {weeklyEarnings.toFixed(2)} AVAX
            </div>
          </div>
          <div className="rounded-md border border-[#6a4060] bg-[#241022] p-3">
            <span className="font-pixel text-[9px] text-[#ff7ac7] uppercase text-outline">JACKPOT</span>
            <div className="mt-1 font-press-start text-sm text-white text-outline">
              {jackpotEarnings.toFixed(2)} AVAX
            </div>
          </div>
        </div>

        <button className="w-full rounded-md bg-[#6fb6ff] py-3 font-pixel text-sm text-white text-outline hover:bg-[#87c4ff] transition-colors">
          CLAIM REWARDS
        </button>
      </div>
    </div>
  );
}
