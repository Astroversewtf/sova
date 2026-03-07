"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
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
import { usePlayerStore } from "@/stores/playerStore";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { getBalance } from "@/lib/avax";

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

function PrivyConnectView() {
  const { ready, authenticated, user } = usePrivy();
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const walletStoreConnect = useWalletStore((s) => s.connect);
  const { setAvaxBalance, loadFromDB } = usePlayerStore();
  const { login } = useLogin({
    onComplete: async ({ user }: any) => {
      const wallet = user?.wallet;
      if (wallet) {
        walletStoreConnect(wallet.address, 43113);
        const balance = await getBalance(wallet?.address as `0x${string}`);
        setAvaxBalance(Number(balance) / 1e18);
        await loadFromDB(wallet.address);
      }
    },
  });

  useEffect(() => {
    if (ready && authenticated && user?.wallet) {
      const address = user.wallet.address;
      walletStoreConnect(address, 43113);
      getBalance(address as `0x${string}`).then((balance: bigint) => {
        setAvaxBalance(Number(balance) / 1e18);
      });
      loadFromDB(address);
    }
  }, [ready, authenticated, user]);

  async function verifyCode() {
    const res = await fetch("/api/beta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    if(res.ok) setUnlocked(true);
  }

  if (!unlocked) {
    return (
      <div className="h-dvh relative overflow-hidden flex flex-col items-center justify-center bg-[#0c1220]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{ backgroundImage: "url('/images/connect-bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0c1220]/60 to-[#0c1220]" />

        <div className="relative z-10 flex flex-col items-center gap-6 px-4">
          <img
            src="/images/logo-sova.png"
            alt="SOVA"
            className="h-40 sm:h-56 object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)]"
            style={{ imageRendering: "pixelated" }}
          />

          <p className="font-pixel text-xs text-gray-400 uppercase tracking-widest">
            Closed Beta Access
          </p>

          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") verifyCode();
              }}
              placeholder="Enter access code..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white text-center placeholder-gray-500 focus:outline-none focus:border-[#b8e550]/50 focus:ring-1 focus:ring-[#b8e550]/30 transition-all"
            />
            <button
              onClick={verifyCode}
              className="w-full bg-[#b8e550] hover:bg-[#c5ed65] text-white font-pixel text-sm py-3 px-8 rounded-lg border-2 border-[#a0cc40]/50 transition-all uppercase tracking-wide shadow-[0_4px_0_#7a9e30] hover:shadow-[0_2px_0_#7a9e30] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
              style={{ textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000" }}
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ConnectLayout>
      <button
        onClick={login}
        className="bg-[#b8e550] hover:bg-[#c5ed65] text-white font-pixel text-lg py-3 px-10 rounded-lg border-2 border-[#a0cc40]/50 transition-all uppercase tracking-wide shadow-[0_4px_0_#7a9e30] hover:shadow-[0_2px_0_#7a9e30] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
        style={{ textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 -2px 0 #000, 0 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000" }}
      >
        CONNECT
      </button>
    </ConnectLayout>
  );
}

/** Dev connect (no Privy needed) */
function DevConnectView() {
  const walletStoreConnect = useWalletStore((s) => s.connect);

  return (
    <ConnectLayout>
      <button
        onClick={() => walletStoreConnect("DEV", 43113)}
        className="bg-[#b8e550] hover:bg-[#c5ed65] text-white font-pixel text-lg py-3 px-10 rounded-lg border-2 border-[#a0cc40]/50 transition-all uppercase tracking-wide shadow-[0_4px_0_#7a9e30] hover:shadow-[0_2px_0_#7a9e30] hover:translate-y-[2px] active:shadow-none active:translate-y-[4px]"
        style={{ textShadow: "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 -2px 0 #000, 0 2px 0 #000, -2px 0 0 #000, 2px 0 0 #000" }}
      >
        PLAY
      </button>
    </ConnectLayout>
  );
}

function ConnectLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh relative overflow-hidden flex flex-col">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/connect-bg.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/50" />

      <header className="relative z-20 flex items-center justify-between px-6 py-3 bg-black/70 border-b border-white/10">
        <img
          src="/images/astroverse-logo.png"
          alt="Astroverse"
          className="h-8 sm:h-10 object-contain cursor-pointer"
          onClick={() => window.open('https://astroverse.wtf', '_blank')}
        />
        <div className="flex items-center gap-5">
          <button className="font-pixel text-[9px] text-gray-300 hover:text-white transition-colors uppercase tracking-wide">
            Leaderboard
          </button>
          <button className="font-pixel text-[9px] text-gray-300 hover:text-white transition-colors uppercase tracking-wide">
            Settings
          </button>
          {/* Discord */}
          <a onClick={() => window.open("https://discord.gg/invite/astroverse")} href="#" className="text-gray-400 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" />
            </svg>
          </a>
          {/* Twitter / X */}
          <a onClick={() => window.open("https://x.com/astroversewtf")} href="#" className="text-gray-400 hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 -mt-16 sm:-mt-24">
        <div className="mb-0">
          <img
            src="/images/logo-sova.png"
            alt="SOVA"
            className="h-[28rem] sm:h-[36rem] object-contain mx-auto drop-shadow-[0_4px_20px_rgba(0,0,0,0.7)]"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
        <div className="-mt-16 sm:-mt-20 relative z-10">
          {children}
        </div>
      </main>

      <div className="relative z-10 py-3 text-center">
        <span className="font-pixel text-[8px] text-white uppercase">
          &copy; 2026 Astroverse. All rights reserved.
        </span>
      </div>
    </div>
  );
}

function ConnectView() {
  const hasPrivy = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (hasPrivy) return <PrivyConnectView />;
  return <DevConnectView />;
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
    <div className="h-dvh flex overflow-hidden bg-black">
      {/* Chat sidebar (desktop: permanent, mobile: floating icon) */}
      <ChatSidebar />
      {/* Game fills remaining space */}
      <div className="flex-1 min-w-0 relative overflow-hidden">
        <PhaserGame />
      </div>
    </div>
  );
}


export default function App() {
  const view = useWalletStore((s) => s.view);

  if (view === "game") return <GameView />;
  if (view === "lobby") return <LobbyView />;
  return <ConnectView />;
}
