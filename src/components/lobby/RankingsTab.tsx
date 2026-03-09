"use client";

import { useEffect, useMemo, useState } from "react";
import { useLobbyStore } from "@/stores/lobbyStore";
import { usePlayerStore } from "@/stores/playerStore";

type LeaderboardEntry = {
  rank: number;
  player: string;
  score: number;
  coins: number;
  gems: number;
  keys: number;
};

export function RankingsTab() {
  const { activeRankingsSubTab, setRankingsSubTab } = useLobbyStore();
  const walletAddress = usePlayerStore((s) => s.walletAddress);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const type = activeRankingsSubTab === "weekly" ? "weekly" : "best";
    fetch(`/api/leaderboard?type=${type}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEntries(data);
        else setEntries([]);
      })
      .catch(() => setEntries([]));
  }, [activeRankingsSubTab]);

  const myEntry = useMemo(() => {
    if (!walletAddress) return null;
    const addr = walletAddress.toLowerCase();
    return entries.find((e) => e.player.toLowerCase() === addr) ?? null;
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
            className={`font-pixel text-[10px] px-4 py-2 rounded border transition-all uppercase text-outline ${
              activeRankingsSubTab === tab
                ? "bg-[#182231] border-[#445266] text-white"
                : "bg-[#111820] border-[#2d3642] text-[#7f8da3] hover:text-[#c7d2df]"
            }`}
          >
            {tab === "weekly" ? "Weekly" : "Best Runs"}
          </button>
        ))}
      </div>

      {/* Global Score */}
      <div className="bg-[#0f1722] border border-[#3b4652] rounded-md p-3 mb-4 text-center">
        <span className="font-pixel text-[9px] text-[#b4c0cf] uppercase text-outline">
          Global Score
        </span>
        <div className="font-press-start text-lg text-white text-outline">{topScore.toLocaleString()}</div>
      </div>

      {/* Your Position */}
      <div className="bg-[#0f1722] border border-[#3b4652] rounded-md p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#1a2431] border border-[#313e4f] text-[#b4c0cf] font-press-start text-xs w-8 h-8 rounded flex items-center justify-center text-outline">
            {myEntry ? `#${myEntry.rank}` : "#--"}
          </div>
          <div>
            <span className="font-pixel text-[10px] text-[#b4c0cf] uppercase text-outline">
              Your Position
            </span>
            <div className="font-press-start text-xs text-white text-outline">
              Score: {myEntry ? myEntry.score.toLocaleString() : "--"}
            </div>
          </div>
        </div>
        <span className="font-pixel text-[9px] text-[#7f8da3] text-outline">YOU</span>
      </div>

      {/* Leaderboard Table */}
      <div className="flex-1 overflow-y-auto rounded-md border border-[#2b3644] bg-[#0b121b] p-3">
        {entries.length === 0 ? (
          <div className="h-full min-h-[180px] flex items-center justify-center">
            <p className="font-pixel text-[11px] text-[#9fb0c3] text-outline">NO GAMES YET.</p>
          </div>
        ) : (
          <>
            <div className="font-press-start text-[9px] text-[#b4c0cf] uppercase mb-2 px-1 text-outline">
              Top 100
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-left font-pixel text-[9px] text-[#7f8da3] border-b border-[#2b3644]">
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
                  <tr key={`${e.rank}-${e.player}`} className="border-b border-[#202a36]">
                    <td className="py-2 pl-2 font-press-start text-[10px] text-[#b4c0cf]">#{e.rank}</td>
                    <td className="py-2 font-pixel text-[10px] text-white">{e.player}</td>
                    <td className="py-2 text-right font-press-start text-[10px] text-white">{e.score.toLocaleString()}</td>
                    <td className="py-2 text-right font-press-start text-[10px] text-[#ffdf75]">{e.coins}</td>
                    <td className="py-2 text-right font-press-start text-[10px] text-[#7cc6ff]">{e.gems}</td>
                    <td className="py-2 text-right pr-2 font-press-start text-[10px] text-[#6fb6ff]">{e.keys}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
