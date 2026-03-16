"use client";

import { usePlayerStore } from "@/stores/playerStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useLobbyStore } from "@/stores/lobbyStore";
import { useEffect, useState } from "react";
import { OverlayFrame } from "@/components/OverlayFrame";

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

function PrizeCard({
  frame,
  value,
  label,
  glowColor,
  countdown,
}: {
  frame: string;
  value: string;
  label: string;
  glowColor: string;
  countdown?: string;
}) {
  return (
    <div className="relative flex-1 min-w-0 aspect-[8/5]">
      <div
        className="absolute inset-0 z-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          className="h-[62%] w-[84%] rounded-full blur-[20px] opacity-80"
          style={{
            background: `radial-gradient(circle at center, ${glowColor} 0%, rgba(0,0,0,0) 70%)`,
          }}
        />
      </div>
      <img
        src={frame}
        alt={label}
        className="absolute inset-0 z-10 w-full h-full"
        style={{ imageRendering: "pixelated" }}
      />
      <div className="absolute inset-0 z-20 flex items-center justify-center">
        <span className="font-press-start text-[clamp(6px,1.8vw,14px)] text-white text-outline-5 leading-none text-center px-1">
          {value}
        </span>
      </div>
      {countdown && (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1">
          <span className="font-press-start text-[clamp(5px,1.4vw,9px)] text-white text-outline whitespace-nowrap leading-none">
            {countdown}
          </span>
        </div>
      )}
    </div>
  );
}

function ResourceBox({
  icon,
  value,
  color,
  iconClass,
  onClick,
}: {
  icon: string;
  value: string | number;
  color: string;
  iconClass?: string;
  onClick?: () => void;
}) {
  const content = (
    <OverlayFrame
      className="relative w-10 h-10 sm:w-14 sm:h-14"
      contentClassName="!p-0 flex items-center justify-center"
      namePrefix="square"
      basePath="/sprites/ui/square_tileset"
      edge={16}
      innerEdge={16}
    >
      <img
        src={icon}
        alt=""
        className={`absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-[50%] ${iconClass ?? "w-7 h-7 sm:w-10 sm:h-10"}`}
        style={{ imageRendering: "pixelated" }}
      />
      <span
        className="relative z-10 font-press-start-crisp text-[8px] sm:text-[11px] leading-none mt-1"
        style={{
          color,
          textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000",
        }}
      >
        {value}
      </span>
    </OverlayFrame>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="bg-transparent">
        {content}
      </button>
    );
  }
  return content;
}

export function TopBar() {
  const { coins, gems, keys } = usePlayerStore();
  const openSettings = useSettingsStore((s) => s.open);
  const setActiveTab = useLobbyStore((s) => s.setActiveTab);
  const countdown = useCountdownToFriday();

  return (
    <div className="shrink-0 px-2 sm:px-[2%] py-2 sm:py-3">
      {/* Mobile: 2 rows, Desktop: 1 row */}

      {/* Row 1: PFP + Prize cards (mobile full width) + Resources on desktop */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* PFP */}
        <div className="shrink-0 w-9 h-9 sm:w-14 sm:h-14 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center overflow-hidden">
          <span className="font-pixel text-[6px] sm:text-[8px] text-white/40">PFP</span>
        </div>

        {/* Prize cards — fill remaining space */}
        <div className="flex items-center gap-0.5 sm:gap-1 flex-1 min-w-0 max-w-[440px]">
          <PrizeCard
            frame="/sprites/ui/hud/prizes/weekly_prize_01.png"
            label="Weekly Pool"
            value="77,191 USD"
            glowColor="#2f74ff"
            countdown={countdown}
          />
          <PrizeCard
            frame="/sprites/ui/hud/prizes/jackpot_prize_01.png"
            label="Jackpot"
            value="14,313 USD"
            glowColor="#d3a13a"
          />
        </div>

        {/* Desktop only: spacer + resources inline */}
        <div className="hidden md:flex flex-1 min-w-0" />
        <div className="hidden md:flex items-center gap-2">
          <ResourceBox icon="/sprites/items/coin/coin_01.png" value={coins.toLocaleString()} color="#fcd34d" />
          <ResourceBox icon="/sprites/items/orb/item_orb_01.png" value={gems} color="#5eead4" />
          <ResourceBox icon="/sprites/items/key/key_02.png" value={keys} color="#fef08a" iconClass="w-6 h-6 sm:w-8 sm:h-8" onClick={() => setActiveTab("shop")} />
          <button type="button" onClick={openSettings} className="w-10 h-10 flex items-center justify-center" aria-label="Settings">
            <img src="/sprites/ui/onboarding/buttons_menu_01.png" alt="" className="w-full h-full" style={{ imageRendering: "pixelated" }} />
          </button>
        </div>
      </div>

      {/* Row 2: Resources (mobile only) */}
      <div className="flex md:hidden items-center justify-end gap-1 mt-1.5">
        <ResourceBox icon="/sprites/items/coin/coin_01.png" value={coins.toLocaleString()} color="#fcd34d" />
        <ResourceBox icon="/sprites/items/orb/item_orb_01.png" value={gems} color="#5eead4" />
        <ResourceBox icon="/sprites/items/key/key_02.png" value={keys} color="#fef08a" iconClass="w-6 h-6" onClick={() => setActiveTab("shop")} />
        <button type="button" onClick={openSettings} className="w-7 h-7 flex items-center justify-center" aria-label="Settings">
          <img src="/sprites/ui/onboarding/buttons_menu_01.png" alt="" className="w-full h-full" style={{ imageRendering: "pixelated" }} />
        </button>
      </div>
    </div>
  );
}
