"use client";

import { useEffect, useMemo, useState } from "react";
import { useLobbyStore } from "@/stores/lobbyStore";
import { usePlayerStore } from "@/stores/playerStore";

const PLACEHOLDER_ENTRIES = [
  { rank: 1, player: "0xA1b2...C3d4", score: 2500, coins: 480, gems: 22, keys: 5 },
  { rank: 2, player: "0xE5f6...G7h8", score: 1800, coins: 350, gems: 15, keys: 3 },
  { rank: 3, player: "0xI9j0...K1l2", score: 1200, coins: 210, gems: 9, keys: 1 },
];

export function RankingsTab() {
  const { activeRankingsSubTab, setRankingsSubTab } = useLobbyStore();
  const walletAddress = usePlayerStore((s) => s.walletAddress);
  const [entries, setEntries] = useState(PLACEHOLDER_ENTRIES);

  useEffect(() => {
    const type = activeRankingsSubTab === "weekly" ? "weekly" : "best";
    fetch(`/api/leaderboard?type=${type}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.length > 0) setEntries(data);
        else setEntries(PLACEHOLDER_ENTRIES);
      })
      .catch(() => setEntries(PLACEHOLDER_ENTRIES));
  }, [activeRankingsSubTab]);

  const myEntry = useMemo(() => {
    if (!walletAddress) return null;
    const addr = walletAddress.toLowerCase();
    const found = entries.find((e) => e.player.toLowerCase() === addr) ?? null;
    console.log("[RankingsTab] wallet:", addr, "entries players:", entries.map(e => e.player), "myEntry:", found);
    return found;
  }, [entries, walletAddress]);

  const topScore = entries[0]?.score ?? 0;

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
        <div className="font-pixel text-lg text-white text-outline">{topScore.toLocaleString()}</div>
      </div>

      {/* Your Position */}
      <div className="bg-black/40 border border-white/15 rounded-lg p-3 mb-4 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 text-gray-400 font-pixel text-xs w-8 h-8 rounded flex items-center justify-center text-outline">
            {myEntry ? `#${myEntry.rank}` : "#--"}
          </div>
          <div>
            <span className="font-pixel text-[10px] text-gray-400 uppercase text-outline">
              Your Position
            </span>
            <div className="font-pixel text-xs text-white text-outline">
              Score: {myEntry ? myEntry.score.toLocaleString() : "--"}
            </div>
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
            {entries.map((e) => (
              <tr key={e.rank} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="py-2 pl-2 font-pixel text-[10px] text-gray-400">#{e.rank}</td>
                <td className="py-2 font-pixel text-[10px] text-white">{e.player}</td>
                <td className="py-2 text-right font-pixel text-[10px] text-white">{e.score.toLocaleString()}</td>
                <td className="py-2 text-right font-pixel text-[10px] text-yellow-400">{e.coins}</td>
                <td className="py-2 text-right font-pixel text-[10px] text-purple-400">{e.gems}</td>
                <td className="py-2 text-right pr-2 font-pixel text-[10px] text-cyan-400">{e.keys}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
