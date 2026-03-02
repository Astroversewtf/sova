"use client";

import dynamic from "next/dynamic";
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
import { useLogin, usePrivy } from "@privy-io/react-auth";

const PhaserGame = dynamic(
  () => import("@/components/PhaserGame").then((mod) => mod.PhaserGame),
  { ssr: false }
);

function ConnectView() {
  const { ready, authenticated, user} = usePrivy();
  const walletStoreConnect = useWalletStore((s) => s.connect);
  const { login } = useLogin({
    onComplete: ({ user }) => {
      const wallet = user?.wallet;
      console.log(wallet?.address);
      if(wallet) {
        walletStoreConnect(wallet.address, 43113)
      }
    }
  })


  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
      <div className="relative z-10 flex flex-col items-center gap-8 p-8">
        {/* Logo */}
        <div className="text-center">
          <h1 className="font-pixel text-4xl text-gray-900 tracking-wider mb-2">
            SOVA
          </h1>
          <div className="w-32 h-0.5 bg-linear-to-r from-transparent via-gray-300 to-transparent mx-auto mb-3" />
          <p className="font-pixel text-[10px] text-gray-400 uppercase tracking-widest">
            Dungeon Maze Crawler
          </p>
          <p className="font-pixel text-[8px] text-gray-400 mt-2 uppercase">
            by Astroverse &bull; Avalanche C-Chain
          </p>
        </div>

        {/* Connect Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 w-full max-w-sm shadow-sm">
            <div className="space-y-3">
              <div className="text-center mb-4">
                <span className="font-pixel text-xs text-gray-700 uppercase">
                  Connect Wallet
                </span>
              </div>
                <button
                  onClick={login}
                  className="w-full bg-white border border-gray-200 hover:border-gray-400 text-gray-800 font-pixel text-[10px] py-3 px-4 rounded-lg transition-all flex items-center justify-between group disabled:opacity-50"
                >
                  CONNECT WITH WALLET
                  <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    &rarr;
                  </span>
                </button>
            </div>
        </div>

        {/* Dev Skip */}
        <button
          onClick={() => {
            walletStoreConnect(
              "0xDEV0000000000000000000000000000DEV",
              43113
            );
          }}
          className="bg-amber-50 border border-amber-300 hover:border-amber-400 text-amber-600 font-pixel text-[9px] px-5 py-2.5 rounded-lg transition-all"
        >
          SKIP &mdash; DEV MODE
        </button>

        {/* Network Badge */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <span className="font-pixel text-[8px] text-gray-400">
            Avalanche Fuji Testnet
          </span>
        </div>

        <p className="font-pixel text-[7px] text-gray-300">
          SOVA v0.1.0 &mdash; ALPHA BUILD
        </p>
      </div>
    </div>
  );
}

function LobbyView() {
  const activeTab = useLobbyStore((s) => s.activeTab);

  return (
    <div className="h-screen flex overflow-hidden">
      <ChatSidebar />
      <div className="flex-1 flex flex-col min-w-0">
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
  );
}

function GameView() {
  return (
    <div className="h-screen flex overflow-hidden">
      <ChatSidebar />
      <div className="flex-1 min-w-0 relative bg-white">
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
