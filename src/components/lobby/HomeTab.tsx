"use client";

import { useWalletStore } from "@/stores/walletStore";

export function HomeTab() {
  const setView = useWalletStore((s) => s.setView);

  return (
    <div className="flex items-center justify-center h-full p-6">
      <div className="flex items-center gap-4">
        {/* Guide button — static */}
        <button className="bg-amber-400 hover:bg-amber-300 text-gray-900 font-pixel text-xl px-12 py-6 rounded-lg border-2 border-amber-500/50 shadow-[0_4px_0_#b45309] hover:shadow-[0_2px_0_#b45309] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all">
          GUIDE
        </button>

        {/* Play button — breathing pulse animation */}
        <button
          onClick={() => setView("game")}
          className="bg-[#b8e550] hover:bg-[#c5ed65] text-gray-900 font-pixel text-xl px-16 py-6 rounded-lg border-2 border-[#a0cc40]/50 shadow-[0_4px_0_#7a9e30] hover:shadow-[0_2px_0_#7a9e30] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px] transition-all animate-play-pulse"
        >
          PLAY
        </button>
      </div>
    </div>
  );
}
