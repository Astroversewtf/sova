"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { useWalletStore } from "@/stores/walletStore";
import { TopBar } from "@/components/TopBar";
import { BottomNav } from "@/components/BottomNav";
import { ChatSidebar } from "@/components/ChatSidebar";
import { HomeTab } from "@/components/lobby/HomeTab";
import { ShopTab } from "@/components/lobby/ShopTab";
import { QuestsTab } from "@/components/lobby/QuestsTab";
import { RankingsTab } from "@/components/lobby/RankingsTab";
import { StashTab } from "@/components/lobby/StashTab";
import { useLobbyStore } from "@/stores/lobbyStore";

const PhaserGame = dynamic(
  () => import("@/components/PhaserGame").then((mod) => mod.PhaserGame),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0c1220]">
        <span className="font-pixel text-xs text-gray-500 animate-pulse">LOADING...</span>
      </div>
    ),
  },
);

function ConnectView() {
  const walletStoreConnect = useWalletStore((s) => s.connect);

  return (
    <div className="h-dvh relative overflow-hidden flex flex-col">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/connect-bg.jpg')" }}
      />
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/50" />

      {/* ── Top bar ── */}
      <header className="relative z-20 flex items-center justify-between px-6 py-3 bg-black/70 border-b border-white/10">
        <img
          src="/images/astroverse-logo.png"
          alt="Astroverse"
          className="h-8 sm:h-10 object-contain"
        />
        <div className="flex items-center gap-5">
          <button className="font-pixel text-[9px] text-gray-300 hover:text-white transition-colors uppercase tracking-wide">
            Leaderboard
          </button>
          <button className="font-pixel text-[9px] text-gray-300 hover:text-white transition-colors uppercase tracking-wide">
            Settings
          </button>
          {/* Discord */}
          <a href="#" className="text-gray-400 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
            </svg>
          </a>
          {/* Twitter / X */}
          <a href="#" className="text-gray-400 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </header>

      {/* ── Center content ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="/images/logo-sova.png"
            alt="SOVA"
            className="h-28 sm:h-36 object-contain mx-auto mb-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]"
            style={{ imageRendering: "pixelated" }}
          />
          <p className="font-pixel text-[10px] text-gray-300 uppercase tracking-widest drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            Dungeon Maze Crawler
          </p>
        </div>

        {/* Card */}
        <div className="bg-black/70 border border-white/15 rounded-xl p-6 sm:p-8 w-full max-w-sm backdrop-blur-sm">
          <button
            onClick={() => walletStoreConnect("0xDEV0000000000000000000000000000DEV", 43113)}
            className="w-full bg-[#b8e550] hover:bg-[#c5ed65] text-gray-900 font-pixel text-sm py-4 px-4 rounded-lg border-2 border-[#a0cc40]/50 transition-all uppercase tracking-wide shadow-[0_4px_0_#7a9e30] hover:shadow-[0_2px_0_#7a9e30] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
          >
            CONNECT WALLET
          </button>
        </div>
      </main>

      {/* ── Copyright text ── */}
      <div className="relative z-10 py-3 text-center">
        <span className="font-pixel text-[8px] text-white uppercase">
          &copy; 2026 Astroverse. All rights reserved.
        </span>
      </div>
    </div>
  );
}

function LobbyView() {
  const activeTab = useLobbyStore((s) => s.activeTab);

  return (
    <div className="h-dvh flex overflow-hidden">
      {/* Chat sidebar (desktop: permanent, mobile: floating icon) */}
      <ChatSidebar />
      {/* Main content with background */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Background image — only behind main content */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/lobby-bg.png')" }}
        />
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative z-10 flex flex-col h-full">
          <TopBar />
          <div className="flex-1 overflow-hidden">
            {activeTab === "home" && <HomeTab />}
            {activeTab === "shop" && <ShopTab />}
            {activeTab === "quests" && <QuestsTab />}
            {activeTab === "rankings" && <RankingsTab />}
            {activeTab === "stash" && <StashTab />}
          </div>
          <BottomNav />
        </div>
      </div>
    </div>
  );
}

function GameView() {
  return (
    <div className="h-dvh flex overflow-hidden bg-[#1a3832]">
      {/* Chat sidebar (desktop: permanent, mobile: floating icon) */}
      <ChatSidebar />
      {/* Game fills remaining space */}
      <div className="flex-1 min-w-0">
        <PhaserGame />
      </div>
    </div>
  );
}

/** Generate a chunky 32×32 pixel art cursor (MoG style) */
function usePixelCursor() {
  useEffect(() => {
    const s = 32;
    const p = 2; // pixel block size
    const c = document.createElement("canvas");
    c.width = s;
    c.height = s;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    // 1=outline, 2=white fill — classic arrow, symmetric sides
    // Each cell = 2×2 px block → 16×16 grid on 32×32 canvas
    const map = [
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,2,2,1,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,2,2,2,1,0,0,0,0,0,0,0,0,0,0,0],
      [1,2,2,2,2,1,0,0,0,0,0,0,0,0,0,0],
      [1,2,2,2,2,2,1,0,0,0,0,0,0,0,0,0],
      [1,2,2,2,2,2,2,1,0,0,0,0,0,0,0,0],
      [1,2,2,2,2,2,2,2,1,0,0,0,0,0,0,0],
      [1,2,2,2,2,2,2,2,2,1,0,0,0,0,0,0],
      [1,2,2,2,2,2,1,1,1,1,0,0,0,0,0,0],
      [1,2,2,1,2,2,1,0,0,0,0,0,0,0,0,0],
      [1,2,1,0,1,2,2,1,0,0,0,0,0,0,0,0],
      [1,1,0,0,1,2,2,1,0,0,0,0,0,0,0,0],
      [1,0,0,0,0,1,2,1,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0],
    ];

    const colors: Record<number, string> = {
      1: "#0a0a0a",
      2: "#ffffff",
    };

    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const v = map[y][x];
        if (v && colors[v]) {
          ctx.fillStyle = colors[v];
          ctx.fillRect(x * p, y * p, p, p);
        }
      }
    }

    const url = c.toDataURL("image/png");
    document.body.style.cursor = `url(${url}) 0 0, auto`;

    return () => { document.body.style.cursor = ""; };
  }, []);
}

export default function App() {
  const view = useWalletStore((s) => s.view);
  usePixelCursor();

  if (view === "game") return <GameView />;
  if (view === "lobby") return <LobbyView />;
  return <ConnectView />;
}
