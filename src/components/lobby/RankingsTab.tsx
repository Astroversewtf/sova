"use client";

import { useLobbyStore } from "@/stores/lobbyStore";

export function RankingsTab() {
  const { activeRankingsSubTab, setRankingsSubTab } = useLobbyStore();

  return (
    <div className="p-6 overflow-y-auto h-full flex flex-col">
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        {(["weekly", "best"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setRankingsSubTab(tab)}
            className={`font-pixel text-[10px] px-4 py-2 rounded transition-all uppercase text-outline ${
              activeRankingsSubTab === tab
                ? "bg-white/20 text-white"
                : "bg-black/30 text-gray-500 hover:text-gray-300 border border-white/10"
            }`}
          >
            {tab === "weekly" ? "Weekly" : "Best Runs"}
          </button>
        ))}
      </div>

      {/* Global Score */}
      <div className="bg-black/40 border border-white/10 rounded-lg p-3 mb-4 text-center backdrop-blur-sm">
        <span className="font-pixel text-[9px] text-gray-400 uppercase text-outline">
          Global Score
        </span>
        <div className="font-pixel text-lg text-white text-outline">--</div>
      </div>

      {/* Your Position */}
      <div className="bg-black/40 border border-white/15 rounded-lg p-3 mb-4 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 text-gray-400 font-pixel text-xs w-8 h-8 rounded flex items-center justify-center text-outline">
            #--
          </div>
          <div>
            <span className="font-pixel text-[10px] text-gray-400 uppercase text-outline">
              Your Position
            </span>
            <div className="font-pixel text-xs text-white text-outline">Score: --</div>
          </div>
        </div>
        <span className="font-pixel text-[9px] text-gray-500 text-outline">YOU</span>
      </div>

      {/* Leaderboard Table */}
      <div className="flex-1 overflow-y-auto">
        <div className="font-pixel text-[9px] text-gray-400 uppercase mb-2 px-1 text-outline">
          Top 100
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left font-pixel text-[9px] text-gray-500 border-b border-white/10">
              <th className="pb-2 pl-2">Rank</th>
              <th className="pb-2">Player</th>
              <th className="pb-2 text-right">Score</th>
              <th className="pb-2 text-right">Coins</th>
              <th className="pb-2 text-right">Gems</th>
              <th className="pb-2 text-right pr-2">Keys</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={6}
                className="text-center py-8 font-pixel text-[10px] text-gray-500"
              >
                No data yet
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
