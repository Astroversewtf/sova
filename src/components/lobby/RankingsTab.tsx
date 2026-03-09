"use client";

import { useEffect, useMemo, useState } from "react";
import { useLobbyStore } from "@/stores/lobbyStore";
import { usePlayerStore } from "@/stores/playerStore";
import { OverlayFrame } from "@/components/OverlayFrame";

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
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center pb-[100px]">
        <div className="flex flex-col items-center gap-3 w-full max-w-[460px]">
          <span className="font-pixel text-xs text-white text-outline uppercase">
            LEADERBOARD
          </span>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2">
            {(["weekly", "best"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setRankingsSubTab(tab)}
                className={`font-pixel text-[10px] uppercase text-outline transition-opacity ${
                  activeRankingsSubTab === tab ? "opacity-100" : "opacity-50"
                }`}
              >
                <OverlayFrame
                  className="h-9 min-w-[100px]"
                  contentClassName="flex items-center justify-center !p-0"
                  namePrefix="square"
                  edge={12}
                  innerEdge={12}
                >
                  <span className="font-pixel text-[10px] text-white text-outline uppercase">
                    {tab === "weekly" ? "Weekly" : "Best Runs"}
                  </span>
                </OverlayFrame>
              </button>
            ))}
          </div>

          {/* Global Score */}
          <OverlayFrame
            className="w-full h-14"
            contentClassName="flex items-center justify-center gap-3 !p-0"
            namePrefix="square"
            edge={16}
            innerEdge={16}
          >
            <span className="font-pixel text-[9px] text-[#b4c0cf] uppercase text-outline">
              TOP SCORE
            </span>
            <span className="font-press-start text-sm text-white text-outline">
              {topScore.toLocaleString()}
            </span>
          </OverlayFrame>

          {/* Your Position */}
          <OverlayFrame
            className="w-full h-14"
            contentClassName="flex items-center justify-between px-4 !p-0"
            namePrefix="square"
            edge={16}
            innerEdge={16}
          >
            <div className="flex items-center gap-3 pl-4">
              <span className="font-press-start text-xs text-[#b4c0cf] text-outline">
                {myEntry ? `#${myEntry.rank}` : "#--"}
              </span>
              <span className="font-pixel text-[10px] text-[#b4c0cf] uppercase text-outline">
                YOU
              </span>
            </div>
            <span className="font-press-start text-xs text-white text-outline pr-4">
              {myEntry ? myEntry.score.toLocaleString() : "--"}
            </span>
          </OverlayFrame>

          {/* Leaderboard list */}
          <OverlayFrame
            className="w-full min-h-[200px]"
            contentClassName="!p-0"
            namePrefix="square"
            edge={16}
            innerEdge={16}
          >
            {entries.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center">
                <p className="font-pixel text-[11px] text-[#9fb0c3] text-outline">NO GAMES YET.</p>
              </div>
            ) : (
              <div className="p-3 max-h-[300px] overflow-y-auto scrollbar-hidden">
                <div className="font-press-start text-[8px] text-[#b4c0cf] uppercase mb-2 px-1 text-outline">
                  Top 100
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-left font-pixel text-[8px] text-[#7f8da3] border-b border-white/10">
                      <th className="pb-2 pl-1">#</th>
                      <th className="pb-2">Player</th>
                      <th className="pb-2 text-right">Score</th>
                      <th className="pb-2 text-right pr-1">Coins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr key={`${e.rank}-${e.player}`} className="border-b border-white/5">
                        <td className="py-1.5 pl-1 font-press-start text-[9px] text-[#b4c0cf]">{e.rank}</td>
                        <td className="py-1.5 font-pixel text-[9px] text-white">{e.player.slice(0, 6)}...{e.player.slice(-4)}</td>
                        <td className="py-1.5 text-right font-press-start text-[9px] text-white">{e.score.toLocaleString()}</td>
                        <td className="py-1.5 text-right pr-1 font-press-start text-[9px] text-[#ffdf75]">{e.coins}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </OverlayFrame>
        </div>
      </div>
    </div>
  );
}
