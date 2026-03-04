"use client";

import { usePlayerStore } from "@/stores/playerStore";
import { useWalletStore } from "@/stores/walletStore";
import { useLogout } from "@privy-io/react-auth";
import { useState, useEffect } from "react";

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

export function TopBar() {
  const { coins, gems, keys, goldenTickets, avaxBalance } = usePlayerStore();
  const countdown = useCountdownToFriday();
  const { logout } = useLogout();
  const [hovered, setHovered] = useState(false);
  const walletDisconnect = useWalletStore((s) => s.disconnect)
  const walletAdress = useWalletStore((s) => s.address)
  const truncatedAddress = walletAdress ? `${walletAdress.slice(0,6)}...${walletAdress.slice(-4)}`: "";

  async function handleLogout() {
    await logout();
    walletDisconnect();
  }


  return (
    <div className="shrink-0 flex items-start px-3 pt-2 pb-1 sm:px-4 sm:pt-3">
      {/* Left — Menu button */}
      <div className="shrink-0 pt-3">
        <button className="w-11 h-11 sm:w-12 sm:h-12 bg-[#1a2332] rounded-xl border border-white/10 flex items-center justify-center hover:bg-[#243044] transition-colors">
          <div className="space-y-1">
            <div className="w-4 h-0.5 bg-white rounded-full" />
            <div className="w-4 h-0.5 bg-white rounded-full" />
            <div className="w-4 h-0.5 bg-white rounded-full" />
          </div>
        </button>
      </div>

      {/* Center — Pool Cards using designer images */}
      <div className="flex-1 flex justify-center gap-4 sm:gap-6 pt-1">
        {/* Weekly Pool */}
        <div className="relative" style={{ width: 360, height: 102 }}>
          <img
            src="/images/prizepool_weekly.png"
            alt="Weekly Pool"
            className="absolute inset-0 w-full h-full"
            style={{ imageRendering: "pixelated" }}
          />
          {/* USD value centered inside the card */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-baseline gap-2 pt-2">
              <span className="font-pixel text-2xl sm:text-4xl text-[#d4a017] text-outline leading-none">
                77,191
              </span>
              <span className="font-pixel text-sm sm:text-lg text-[#d4a017] text-outline">
                USD
              </span>
            </div>
          </div>
          {/* Countdown overlapping bottom border */}
          <div className="absolute left-1/2 -translate-x-1/2 -bottom-1">
            <span className="font-pixel text-[9px] sm:text-xs text-white text-outline tracking-wider whitespace-nowrap leading-none">
              {countdown}
            </span>
          </div>
        </div>

        {/* Jackpot */}
        <div className="relative" style={{ width: 360, height: 102 }}>
          <img
            src="/images/prizepool_jackpot.png"
            alt="Jackpot"
            className="absolute inset-0 w-full h-full"
            style={{ imageRendering: "pixelated" }}
          />
          {/* USD value centered inside the card */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-baseline gap-2 pt-2">
              <span className="font-pixel text-2xl sm:text-4xl text-[#ff6eb4] text-outline leading-none">
                14,313
              </span>
              <span className="font-pixel text-sm sm:text-lg text-[#ff6eb4] text-outline">
                USD
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — Loot Grid (2 cols × 3 rows) */}
      <div className="shrink-0 grid grid-cols-2 gap-1 sm:gap-1.5 pt-2">
        <LootCard icon="🪙" value={coins.toLocaleString()} />
        <LootCard icon="🗝️" value={keys.toLocaleString()} />
        <LootCard icon="💎" value={gems.toLocaleString()} />
        <LootCard icon="🎫" value={goldenTickets.toLocaleString()} />
        <LootCard icon="💜" value={avaxBalance.toFixed(4)} colSpan />
      </div>
    </div>
  );
}

function LootCard({
  icon,
  value,
  colSpan = false,
}: {
  icon: string;
  value: string;
  colSpan?: boolean;
}) {
  return (
    <div
      className={`bg-[#1a2332]/90 rounded-lg px-2 py-1.5 sm:px-2.5 sm:py-2 flex items-center justify-between gap-2 border border-white/10 ${
        colSpan ? "col-span-2" : ""
      }`}
    >
      <span className="text-sm sm:text-base leading-none">{icon}</span>
      <span className="font-pixel text-[8px] sm:text-[9px] text-white text-outline">
        {value}
      </span>
    </div>
  );
}
