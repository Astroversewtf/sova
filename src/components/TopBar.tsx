"use client";

import { usePlayerStore } from "@/stores/playerStore";

export function TopBar() {
  const { coins, gems, keys, goldenTickets, avaxBalance } = usePlayerStore();

  return (
    <div className="h-14 sm:h-16 bg-black/60 backdrop-blur-sm border-b border-white/10 flex items-center justify-between px-3 sm:px-4 shrink-0">
      {/* Weekly Pool — hidden on mobile */}
      <div className="hidden sm:flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-pixel text-gray-400 uppercase">
            Weekly Pool
          </span>
          <span className="text-sm font-pixel text-white">-- AVAX</span>
        </div>

        <div className="w-px h-10 bg-white/20" />

        <div className="flex flex-col">
          <span className="text-[10px] font-pixel text-gray-400 uppercase">
            Jackpot
          </span>
          <span className="text-sm font-pixel text-white">-- AVAX</span>
        </div>
      </div>

      {/* Mobile: SOVA title */}
      <span className="font-pixel text-xs text-white sm:hidden">SOVA</span>

      {/* Player Stats */}
      <div className="flex items-center gap-2 sm:gap-4">
        <StatBadge icon="🪙" value={coins} color="text-amber-400" />
        <StatBadge icon="💎" value={gems} color="text-purple-400" />
        <StatBadge icon="🗝️" value={keys} color="text-blue-400" />
        <StatBadge icon="🎫" value={goldenTickets} color="text-amber-300" className="hidden sm:flex" />
        <div className="w-px h-8 bg-white/20" />
        <div className="flex flex-col items-end">
          <span className="text-[9px] sm:text-[10px] font-pixel text-gray-500">AVAX</span>
          <span className="text-xs sm:text-sm font-pixel text-white">
            {avaxBalance.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatBadge({
  icon,
  value,
  color,
  className = "",
}: {
  icon: string;
  value: number;
  color: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-sm">{icon}</span>
      <span className={`text-xs font-pixel ${color}`}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}
