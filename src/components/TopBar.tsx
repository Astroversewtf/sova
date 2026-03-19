"use client";

import { usePlayerStore } from "@/stores/playerStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useLobbyStore } from "@/stores/lobbyStore";
import { useEffect, useState } from "react";

function useCountdownToFriday() {
  const [text, setText] = useState("");

  useEffect(() => {
    function calc() {
      const now = new Date();
      const day = now.getDay();
      let daysLeft = (5 - day + 7) % 7;
      if (daysLeft === 0) {
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const ms = endOfDay.getTime() - now.getTime();
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        setText(`${h}H ${String(m).padStart(2, "0")}M ${String(s).padStart(2, "0")}S`);
        return;
      }
      const friday = new Date(now);
      friday.setDate(now.getDate() + daysLeft);
      friday.setHours(0, 0, 0, 0);
      const ms = friday.getTime() - now.getTime();
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setText(`${d}D ${h}H ${String(m).padStart(2, "0")}M ${String(s).padStart(2, "0")}S`);
    }

    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  return text;
}

/*
  TOP BAR — placeholder wireframe matching sketch.
  Replace the wrapper div and inner boxes with themed images when ready.
  Structure: [PFP] [weekly pool] [jackpot] ... [coin] [orbs] [keys] [sett]
*/
export function TopBar() {
  const { coins, gems, keys } = usePlayerStore();
  const openSettings = useSettingsStore((s) => s.open);
  const setActiveTab = useLobbyStore((s) => s.setActiveTab);
  const countdown = useCountdownToFriday();

  return (
    <div className="shrink-0 w-full border-2 border-white/30 bg-black/20">
      <div className="flex items-center h-14 sm:h-16 md:h-18 px-2 sm:px-3 gap-2 sm:gap-3">
        {/* PFP */}
        <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 border-2 border-white/30 flex items-center justify-center">
          <span className="font-press-start text-[8px] sm:text-[10px] text-white/60">pfp</span>
        </div>

        {/* Weekly Pool */}
        <div className="flex-1 min-w-0 h-9 sm:h-11 border-2 border-white/30 flex flex-col items-center justify-center">
          <span className="font-press-start text-[clamp(6px,1.4vw,10px)] text-white/60 leading-none">weekly pool</span>
          {countdown && (
            <span className="font-press-start text-[clamp(4px,1vw,7px)] text-white/40 leading-none mt-0.5">{countdown}</span>
          )}
        </div>

        {/* Jackpot */}
        <div className="flex-1 min-w-0 h-9 sm:h-11 border-2 border-white/30 flex items-center justify-center">
          <span className="font-press-start text-[clamp(6px,1.4vw,10px)] text-white/60 leading-none">jackpot</span>
        </div>

        {/* Spacer */}
        <div className="flex-1 min-w-0 hidden md:block" />

        {/* Resources */}
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="h-8 sm:h-10 px-2 sm:px-3 border-2 border-white/30 flex items-center justify-center gap-1">
            <span className="font-press-start text-[clamp(5px,1.2vw,8px)] text-white/60 leading-none">coin</span>
            <span className="font-press-start text-[clamp(5px,1.2vw,8px)] text-yellow-300/80 leading-none">{coins.toLocaleString()}</span>
          </div>
          <div className="h-8 sm:h-10 px-2 sm:px-3 border-2 border-white/30 flex items-center justify-center gap-1">
            <span className="font-press-start text-[clamp(5px,1.2vw,8px)] text-white/60 leading-none">orbs</span>
            <span className="font-press-start text-[clamp(5px,1.2vw,8px)] text-teal-300/80 leading-none">{gems}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("shop")}
            className="h-8 sm:h-10 px-2 sm:px-3 border-2 border-white/30 flex items-center justify-center gap-1"
          >
            <span className="font-press-start text-[clamp(5px,1.2vw,8px)] text-white/60 leading-none">keys</span>
            <span className="font-press-start text-[clamp(5px,1.2vw,8px)] text-yellow-200/80 leading-none">{keys}</span>
          </button>
          <button
            type="button"
            onClick={openSettings}
            className="h-8 sm:h-10 w-8 sm:w-10 border-2 border-white/30 flex items-center justify-center"
            aria-label="Settings"
          >
            <span className="font-press-start text-[clamp(5px,1vw,8px)] text-white/60 leading-none">sett</span>
          </button>
        </div>
      </div>
    </div>
  );
}
