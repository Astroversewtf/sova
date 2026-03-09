"use client";

import { usePlayerStore } from "@/stores/playerStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { OverlayFrame } from "@/components/OverlayFrame";
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

function LootStat({ icon, value, alt }: { icon: string; value: string; alt: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <img src={icon} alt={alt} className="w-5 h-5" style={{ imageRendering: "pixelated" }} />
      <span className="font-press-start text-[10px] text-white text-outline">{value}</span>
    </div>
  );
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
    <div className="relative w-[clamp(248px,24vw,318px)] aspect-[8/5]">
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
        <span className="font-press-start text-[clamp(12px,1.2vw,18px)] text-white text-outline-5 leading-none text-center px-3">
          {value}
        </span>
      </div>
      {countdown && (
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-1">
          <span className="font-press-start text-[9px] sm:text-xs text-white text-outline whitespace-nowrap leading-none">
            {countdown}
          </span>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const { coins, gems, keys } = usePlayerStore();
  const openSettings = useSettingsStore((s) => s.open);
  const countdown = useCountdownToFriday();
  const rowAnchorY = "58%";

  return (
    <div className="relative shrink-0 h-[clamp(138px,18vh,186px)] px-[1.8%]">
      <div
        className="absolute z-30 w-[92px] flex justify-center -translate-y-1/2"
        style={{ top: rowAnchorY, left: "2.2%" }}
      >
        <button
          type="button"
          onClick={openSettings}
          className="relative w-12 h-12 flex items-center justify-center"
          aria-label="Open settings"
        >
          <img
            src="/sprites/ui/onboarding/square_button_01.png"
            alt=""
            className="absolute inset-0 w-full h-full"
            style={{ imageRendering: "pixelated" }}
          />
        </button>
      </div>

      <div
        className="absolute z-30 -translate-y-1/2"
        style={{ top: rowAnchorY, right: "2%" }}
      >
        <OverlayFrame
          className="w-[220px] h-[64px]"
          contentClassName="h-full w-full"
          edge={16}
          innerEdge={10}
        >
          <div className="h-full w-full flex items-center justify-center gap-3">
            <LootStat icon="/sprites/items/coin/coin_01.png" alt="Coins" value={coins.toLocaleString()} />
            <LootStat icon="/sprites/items/orb/item_orb_01.png" alt="Orbs" value={gems.toLocaleString()} />
            <LootStat icon="/sprites/items/key/key_02.png" alt="Keys" value={keys.toLocaleString()} />
          </div>
        </OverlayFrame>
      </div>

      <div
        className="absolute left-1/2 z-20 -translate-y-1/2 -translate-x-[120%]"
        style={{ top: rowAnchorY }}
      >
        <div className="relative">
          <PrizeCard
            frame="/sprites/ui/hud/prizes/weekly_prize_01.png"
            label="Weekly Pool"
            value="77,191 USD"
            glowColor="#2f74ff"
            countdown={countdown}
          />
          <div className="absolute top-0 left-full ml-[-6%]">
            <PrizeCard
              frame="/sprites/ui/hud/prizes/jackpot_prize_01.png"
              label="Jackpot"
              value="14,313 USD"
              glowColor="#d3a13a"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
