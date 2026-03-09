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
import { LobbySpotlightBackground } from "@/components/lobby/LobbySpotlightBackground";
import { SettingsOverlay } from "@/components/SettingsOverlay";
import { AudioController } from "@/components/AudioController";
import { OverlayFrame } from "@/components/OverlayFrame";
import { OverlayTitlePill } from "@/components/OverlayTitlePill";
import { useLobbyStore } from "@/stores/lobbyStore";
import { usePlayerStore } from "@/stores/playerStore";
import { useSettingsStore } from "@/stores/settingsStore";
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

  return <OnboardingLayout onPlay={login} />;
}

/** Dev connect (no Privy needed) */
function DevConnectView() {
  const walletStoreConnect = useWalletStore((s) => s.connect);
  const loadFromDB = usePlayerStore((s) => s.loadFromDB);

  return <OnboardingLayout onPlay={async () => {
    walletStoreConnect("DEV", 43113);
    await loadFromDB("DEV");
  }} />;
}

function OnboardingLayout({ onPlay }: { onPlay: () => void }) {
  const openSettings = useSettingsStore((s) => s.open);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const HAND_CURSOR = "url('/sprites/ui/cursor/cursor_hand_01.png') 6 0, pointer";

  const onLeaderboard = () => setLeaderboardOpen(true);
  const onDiscord = () => window.open("https://discord.gg/invite/astroverse", "_blank");
  const onTwitter = () => window.open("https://x.com/astroversewtf/", "_blank");
  const onWebsite = () => window.open("https://www.astroverse.wtf", "_blank");

  return (
    <div className="onboarding-screen h-dvh w-full relative overflow-hidden bg-black">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/onboarding-bg.png')", opacity: 0.8 }}
      />
      <div className="absolute inset-y-0 left-0 w-[28%] bg-gradient-to-r from-black via-black/65 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-[28%] bg-gradient-to-l from-black via-black/65 to-transparent" />

      <div className="absolute inset-0 z-20 px-[clamp(8px,2vw,28px)] py-[clamp(8px,1.8vh,22px)]">
        <div className="h-full w-full flex items-start justify-between">
          <div
            className="relative w-[clamp(180px,54vw,400px)]"
            style={{ transform: "translate(clamp(10px,2vw,28px), clamp(14px,3vh,38px))" }}
          >
            <img
              src="/images/logo-sova.png"
              alt="SOVA"
              className="mx-auto w-[86%] h-auto object-contain"
              style={{ imageRendering: "pixelated" }}
            />

            <div
              className="mx-auto w-[86%] flex flex-col items-center gap-[clamp(6px,0.8vw,10px)]"
              style={{ marginTop: "clamp(4px, 1.2vw, 14px)" }}
            >
              <button
                type="button"
                onClick={onPlay}
                className="relative w-[74%] cursor-pointer"
                style={{ cursor: HAND_CURSOR }}
                aria-label="Play"
              >
                <img
                  src="/sprites/ui/onboarding/buttons_play_01_trimmed.png"
                  alt=""
                  className="w-full h-auto object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </button>

              <button
                type="button"
                onClick={onLeaderboard}
                className="relative w-[48%] cursor-pointer"
                style={{ cursor: HAND_CURSOR }}
                aria-label="Leaderboard"
              >
                <img
                  src="/sprites/ui/onboarding/buttons_leaderboard_01.png"
                  alt=""
                  className="w-full h-auto object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </button>
              <button
                type="button"
                onClick={openSettings}
                className="relative w-[48%] cursor-pointer"
                style={{ cursor: HAND_CURSOR }}
                aria-label="Settings"
              >
                <img
                  src="/sprites/ui/onboarding/buttons_settings_01.png"
                  alt=""
                  className="w-full h-auto object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </button>
            </div>
          </div>

          <div className="self-center flex flex-col items-center gap-3 pr-[clamp(8px,1vw,20px)]">
            <button
              type="button"
              onClick={onWebsite}
              className="relative w-[clamp(34px,3.4vw,38px)] h-[clamp(34px,3.4vw,38px)] flex items-center justify-center cursor-pointer"
              style={{ cursor: HAND_CURSOR }}
              aria-label="Website"
            >
              <img
                src="/sprites/ui/onboarding/buttons_website_01.png"
                alt=""
                className="absolute inset-0 w-full h-full object-fill"
                style={{ imageRendering: "pixelated" }}
              />
            </button>
            <button
              type="button"
              onClick={onTwitter}
              className="relative w-[clamp(34px,3.4vw,38px)] h-[clamp(34px,3.4vw,38px)] flex items-center justify-center cursor-pointer"
              style={{ cursor: HAND_CURSOR }}
              aria-label="Twitter"
            >
              <img
                src="/sprites/ui/onboarding/buttons_twitter_01.png"
                alt=""
                className="absolute inset-0 w-full h-full object-fill"
                style={{ imageRendering: "pixelated" }}
              />
            </button>
            <button
              type="button"
              onClick={onDiscord}
              className="relative w-[clamp(34px,3.4vw,38px)] h-[clamp(34px,3.4vw,38px)] flex items-center justify-center cursor-pointer"
              style={{ cursor: HAND_CURSOR }}
              aria-label="Discord"
            >
              <img
                src="/sprites/ui/onboarding/buttons_discord_01.png"
                alt=""
                className="absolute inset-0 w-full h-full object-fill"
                style={{ imageRendering: "pixelated" }}
              />
            </button>
          </div>
        </div>
      </div>

      {leaderboardOpen && (
        <div
          className="fixed inset-0 z-[130] bg-black/72 backdrop-blur-[3px] flex items-center justify-center px-4 py-6"
          onClick={() => setLeaderboardOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <OverlayFrame
              className="w-[min(500px,90vw)] h-[min(640px,88dvh)]"
              contentClassName="flex h-full w-full flex-col"
              edge={64}
            >
              <div className="relative flex h-full w-full flex-col px-3 sm:px-4 py-2">
                <OverlayTitlePill
                  title="Leaderboard"
                  className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-[72%]"
                  width="min(290px,74%)"
                />
              <div className="flex-1 overflow-y-auto flex items-center justify-center pt-4">
                <p className="font-pixel text-[14px] text-white/80 text-center">NO GAMES YET.</p>
              </div>
              </div>
            </OverlayFrame>
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-center">
        <span className="font-press-start text-[8px] text-white uppercase">
          © 2026 ASTROVERSE. ALL RIGHTS RESERVED.
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
    <div className="lobby-screen h-dvh relative overflow-hidden bg-black">
      <LobbySpotlightBackground />
      <div className="relative z-10 h-full flex">
        {/* Chat sidebar (desktop: permanent, mobile: floating icon) */}
        <ChatSidebar />
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <TopBar />
          <div className="relative flex-1 overflow-hidden">
            <div className="h-full box-border pt-[12%] px-[108px] sm:px-[120px] lg:px-[132px]">
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

  let content: React.ReactNode;
  if (view === "game") content = <GameView />;
  else if (view === "lobby") content = <LobbyView />;
  else content = <ConnectView />;

  return (
    <>
      {content}
      <AudioController />
      <SettingsOverlay />
    </>
  );
}
