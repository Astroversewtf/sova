"use client";

import { useWalletStore } from "@/stores/walletStore";

export function HomeTab() {
  const setView = useWalletStore((s) => s.setView);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-6">
      {/* Event Banner */}
      <div className="w-full max-w-lg bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-center">
          <span className="font-pixel text-[10px] text-gray-400 uppercase">
            Event
          </span>
          <h3 className="font-pixel text-sm text-gray-800 mt-1">--</h3>
        </div>
      </div>

      {/* Play Button */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={() => setView("game")}
          className="relative group"
        >
          <div className="absolute inset-0 bg-gray-900/5 rounded-lg blur-xl group-hover:bg-gray-900/10 transition-all" />
          <div className="relative bg-gray-900 hover:bg-gray-800 text-white font-pixel text-xl px-16 py-6 rounded-lg border-2 border-gray-700 shadow-lg transition-all active:scale-95">
            PLAY
          </div>
        </button>

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded px-4 py-2">
          <span className="font-pixel text-[10px] text-gray-400">
            Entry Fee:
          </span>
          <span className="font-pixel text-xs text-gray-800">-- AVAX</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
        <QuickStat label="Players Online" value="--" />
        <QuickStat label="Runs Today" value="--" />
        <QuickStat label="Your Best" value="--" />
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
      <div className="font-pixel text-[9px] text-gray-400 uppercase">
        {label}
      </div>
      <div className="font-pixel text-sm text-gray-800 mt-1">{value}</div>
    </div>
  );
}
