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

/*
  LEADERBOARD TAB — placeholder wireframe matching sketch (page 1).
  Layout: [WEEKLY | BEST RUNS] tabs, top 3 podium (pfp + name + chest + points + rank),
  then table rows: [rank] [pfp] [name] ... [coins] [orbs] [points].
  Replace border boxes with themed art when ready.
*/
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

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="h-full flex flex-col items-center px-2 pt-2 sm:pt-4 overflow-y-auto">
      <div className="w-full max-w-[540px] flex flex-col gap-3 sm:gap-4 pb-4">
        {/* Sub-tabs: WEEKLY | BEST RUNS */}
        <div className="flex items-center justify-center">
          {(["weekly", "best"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setRankingsSubTab(tab)}
              className={`flex-1 max-w-[160px] border-2 border-white/30 h-10 sm:h-12 flex items-center justify-center transition-colors
                ${activeRankingsSubTab === tab ? "bg-white/10" : ""}
              `}
            >
              <span className={`font-press-start text-[clamp(6px,1.4vw,10px)] leading-none whitespace-nowrap
                ${activeRankingsSubTab === tab ? "text-white/80" : "text-white/40"}
              `}>
                {tab === "weekly" ? "WEEKLY" : "BEST RUNS"}
              </span>
            </button>
          ))}
        </div>

        {/* Top 3 podium */}
        {top3.length > 0 ? (
          <div className="flex items-end justify-center gap-2 sm:gap-3">
            {/* 2nd place */}
            {top3[1] ? (
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-white/30 flex items-center justify-center">
                  <span className="font-press-start text-[6px] text-white/30">pfp</span>
                </div>
                <span className="font-press-start text-[clamp(5px,1.2vw,8px)] text-white/50">{top3[1].player.slice(0, 6)}</span>
                <div className="w-10 h-8 sm:w-12 sm:h-10 border border-white/20 flex items-center justify-center">
                  <span className="font-press-start text-[5px] text-white/30">chest</span>
                </div>
                <span className="font-press-start text-[clamp(6px,1.3vw,9px)] text-white/50">{top3[1].score}</span>
                <div className="w-8 h-8 border-2 border-white/30 flex items-center justify-center">
                  <span className="font-press-start text-[10px] text-white/60">2</span>
                </div>
              </div>
            ) : <div className="w-14" />}

            {/* 1st place (elevated) */}
            {top3[0] ? (
              <div className="flex flex-col items-center gap-1 -translate-y-3">
                <div className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-white/30 flex items-center justify-center">
                  <span className="font-press-start text-[6px] text-white/30">pfp</span>
                </div>
                <span className="font-press-start text-[clamp(5px,1.2vw,8px)] text-white/50">{top3[0].player.slice(0, 6)}</span>
                <div className="w-12 h-10 sm:w-14 sm:h-12 border border-white/20 flex items-center justify-center">
                  <span className="font-press-start text-[5px] text-white/30">chest</span>
                </div>
                <span className="font-press-start text-[clamp(6px,1.3vw,9px)] text-white/50">{top3[0].score}</span>
                <div className="w-8 h-8 border-2 border-white/30 flex items-center justify-center">
                  <span className="font-press-start text-[10px] text-white/60">1</span>
                </div>
              </div>
            ) : null}

            {/* 3rd place */}
            {top3[2] ? (
              <div className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 sm:w-14 sm:h-14 border-2 border-white/30 flex items-center justify-center">
                  <span className="font-press-start text-[6px] text-white/30">pfp</span>
                </div>
                <span className="font-press-start text-[clamp(5px,1.2vw,8px)] text-white/50">{top3[2].player.slice(0, 6)}</span>
                <div className="w-10 h-8 sm:w-12 sm:h-10 border border-white/20 flex items-center justify-center">
                  <span className="font-press-start text-[5px] text-white/30">chest</span>
                </div>
                <span className="font-press-start text-[clamp(6px,1.3vw,9px)] text-white/50">{top3[2].score}</span>
                <div className="w-8 h-8 border-2 border-white/30 flex items-center justify-center">
                  <span className="font-press-start text-[10px] text-white/60">3</span>
                </div>
              </div>
            ) : <div className="w-14" />}
          </div>
        ) : (
          <div className="border-2 border-white/30 h-32 flex items-center justify-center">
            <span className="font-press-start text-[clamp(7px,1.6vw,11px)] text-white/30">NO GAMES YET</span>
          </div>
        )}

        {/* Leaderboard rows */}
        {rest.map((e) => {
          const isMe = walletAddress && e.player.toLowerCase() === walletAddress.toLowerCase();
          return (
            <div
              key={`${e.rank}-${e.player}`}
              className={`w-full border-2 border-white/30 h-10 sm:h-12 flex items-center px-2 sm:px-3 gap-2 sm:gap-3
                ${isMe ? "bg-white/10" : ""}
              `}
            >
              <span className="font-press-start text-[clamp(6px,1.3vw,9px)] text-white/50 w-8 shrink-0">{e.rank}</span>
              <div className="w-6 h-6 sm:w-8 sm:h-8 border border-white/20 shrink-0 flex items-center justify-center">
                <span className="font-press-start text-[4px] text-white/20">pfp</span>
              </div>
              <span className="font-press-start text-[clamp(5px,1.2vw,8px)] text-white/60 flex-1 min-w-0 truncate">
                {e.player.slice(0, 6)}...{e.player.slice(-4)}
              </span>
              <span className="font-press-start text-[clamp(5px,1.1vw,7px)] text-white/40 shrink-0">coins</span>
              <span className="font-press-start text-[clamp(5px,1.1vw,7px)] text-white/40 shrink-0">orbs</span>
              <span className="font-press-start text-[clamp(6px,1.3vw,9px)] text-white/60 shrink-0">{e.score}</span>
            </div>
          );
        })}

        {/* Your position highlight */}
        {myEntry && myEntry.rank > 3 && (
          <div className="w-full border-2 border-white/30 bg-white/10 h-10 sm:h-12 flex items-center px-2 sm:px-3 gap-2 sm:gap-3">
            <span className="font-press-start text-[clamp(6px,1.3vw,9px)] text-white/50 w-8 shrink-0">#{myEntry.rank}</span>
            <div className="w-6 h-6 sm:w-8 sm:h-8 border border-white/20 shrink-0 flex items-center justify-center">
              <span className="font-press-start text-[4px] text-white/20">you</span>
            </div>
            <span className="font-press-start text-[clamp(5px,1.2vw,8px)] text-white/60 flex-1 min-w-0 truncate">YOU</span>
            <span className="font-press-start text-[clamp(6px,1.3vw,9px)] text-white/60 shrink-0">{myEntry.score}</span>
          </div>
        )}
      </div>
    </div>
  );
}
