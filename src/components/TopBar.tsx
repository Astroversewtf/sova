"use client";

import { usePlayerStore } from "@/stores/playerStore";
import { useWalletStore } from "@/stores/walletStore";
import { useLogout } from "@privy-io/react-auth";

export function TopBar() {
  const { coins, gems, keys, goldenTickets, avaxBalance } = usePlayerStore();
  const { logout } = useLogout();
  const walletDisconnect = useWalletStore((s) => s.disconnect)

  async function handleLogout() {
    await logout();
    walletDisconnect();
  }


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
        <button className="w-32 h-full bg-[#b8e550] hover:bg-[#c5ed65] text-gray-900 font-pixel text-sm py-4 px-4 rounded-lg border-2 border-[#a0cc40]/50 transition-all uppercase tracking-wide shadow-[0_4px_0_#7a9e30] hover:shadow-[0_2px_0_#7a9e30] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]" onClick={handleLogout}>Logout</button>
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
