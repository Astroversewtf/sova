"use client";

import { useLobbyStore, type LobbyTab } from "@/stores/lobbyStore";

type NavItem = {
  id: LobbyTab | "guide";
  label: string;
  icon: string;
};

const leftItems: NavItem[] = [
  { id: "rankings", label: "LEADERBOARD", icon: "/sprites/ui/onboarding/icons_leaderboard_01.png" },
  { id: "stash", label: "STASH", icon: "/sprites/ui/onboarding/icons_stash_01.png" },
  { id: "home", label: "HOME", icon: "/sprites/ui/onboarding/icons_home_01.png" },
];

const rightItems: NavItem[] = [
  { id: "quests", label: "QUESTS", icon: "/sprites/ui/onboarding/icons_quest_01.png" },
  { id: "shop", label: "SHOP", icon: "/sprites/ui/onboarding/icons_shop_01.png" },
  { id: "guide", label: "GUIDE", icon: "/sprites/ui/onboarding/icons_guide_01.png" },
];

function NavButton({
  label,
  icon,
  active = false,
  onClick,
}: {
  label: string;
  icon: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center"
    >
      <img
        src={icon}
        alt=""
        className={`w-full h-full ${active ? "opacity-100" : "opacity-80"}`}
        style={{ imageRendering: "pixelated" }}
      />
    </button>
  );
}

export function BottomNav() {
  const { activeTab, setActiveTab, keyPickerOpen, setKeyPickerOpen } = useLobbyStore();

  function handlePlayClick() {
    if (keyPickerOpen) {
      // Key picker is open — trigger actual game start
      window.dispatchEvent(new Event("sova:request-play"));
    } else {
      // Open key picker, switch to home tab
      setActiveTab("home");
      setKeyPickerOpen(true);
    }
  }

  function handleHomeClick() {
    setKeyPickerOpen(false);
    setActiveTab("home");
  }

  function handleNavClick(item: NavItem) {
    if (item.id === "home") {
      handleHomeClick();
    } else if (item.id !== "guide") {
      setActiveTab(item.id as LobbyTab);
    }
  }

  return (
    <div className="pointer-events-none absolute bottom-3 left-0 right-0 z-30 flex items-center justify-center">
      <div className="pointer-events-auto flex items-center gap-3">
        {leftItems.map((item) => {
          const isTab = item.id !== "guide";
          const active = isTab ? activeTab === item.id && !keyPickerOpen : false;
          return (
            <NavButton
              key={item.id}
              label={item.label}
              icon={item.icon}
              active={active}
              onClick={() => handleNavClick(item)}
            />
          );
        })}

        <div className="w-4" />

        <button
          type="button"
          onClick={handlePlayClick}
          className={`relative w-[min(220px,30vw)] h-[min(55px,7.5vw)] flex items-center justify-center ${keyPickerOpen ? "animate-play-pulse" : ""}`}
          aria-label="Play"
        >
          <img
            src={keyPickerOpen
              ? "/sprites/ui/buttons/buttons_play_lobby_01.png"
              : "/sprites/ui/buttons/buttons_play_01.png"
            }
            alt=""
            className="h-full w-auto"
            style={{ imageRendering: "pixelated" }}
          />
        </button>

        <div className="w-4" />

        {rightItems.map((item) => {
          const isTab = item.id !== "guide";
          const active = isTab ? activeTab === item.id : false;
          return (
            <NavButton
              key={item.id}
              label={item.label}
              icon={item.icon}
              active={active}
              onClick={() => handleNavClick(item)}
            />
          );
        })}
      </div>
    </div>
  );
}
