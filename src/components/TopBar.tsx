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
    <div className="h-16 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      {/* Weekly Pool */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-[10px] font-pixel text-gray-500 uppercase">
            Weekly Pool
          </span>
          <span className="text-sm font-pixel text-gray-800">-- AVAX</span>
        </div>

        <div className="w-px h-10 bg-gray-200" />

        <div className="flex flex-col">
          <span className="text-[10px] font-pixel text-gray-500 uppercase">
            Jackpot
          </span>
          <span className="text-sm font-pixel text-gray-800">-- AVAX</span>
        </div>
      </div>

      {/* Player Stats */}
      <div className="flex items-center gap-4">
        <button className="w-32 h-8 bg-black rounded-4xl text-white cursor-pointer" onClick={handleLogout}>Logout</button>
        <StatBadge icon="🪙" value={coins} color="text-amber-600" />
        <StatBadge icon="💎" value={gems} color="text-purple-600" />
        <StatBadge icon="🗝️" value={keys} color="text-blue-600" />
        <StatBadge icon="🎫" value={goldenTickets} color="text-amber-500" />
        <div className="w-px h-8 bg-gray-200" />
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-pixel text-gray-400">AVAX</span>
          <span className="text-sm font-pixel text-gray-800">
            {avaxBalance.toFixed(3)}
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
}: {
  icon: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-sm">{icon}</span>
      <span className={`text-xs font-pixel ${color}`}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}
