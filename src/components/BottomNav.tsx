"use client";

import { useLobbyStore, type LobbyTab } from "@/stores/lobbyStore";

type NavItem = {
  id: LobbyTab;
  label: string;
};

const navItems: NavItem[] = [
  { id: "rankings", label: "leaderboard" },
  { id: "stash", label: "stash" },
  { id: "home", label: "home" },
  { id: "quests", label: "quests" },
  { id: "shop", label: "store" },
];

/*
  BOTTOM NAV BAR — placeholder wireframe matching sketch.
  Replace wrapper + buttons with themed art/images when ready.
  Structure: [leaderboard] [stash] [HOME ↑] [quests] [store]
*/
export function BottomNav() {
  const { activeTab, setActiveTab, setKeyPickerOpen } = useLobbyStore();

  function handleNavClick(item: NavItem) {
    if (item.id === "home") {
      setKeyPickerOpen(false);
    }
    setActiveTab(item.id);
  }

  return (
    <div className="shrink-0 w-full z-30 border-t-2 border-white/30 bg-black/20 flex items-end">
      {navItems.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleNavClick(item)}
            className={`flex-1 border-r-2 last:border-r-0 border-white/30 flex items-center justify-center transition-all duration-150
              ${active
                ? "h-14 sm:h-16 md:h-18 border-2 border-b-0 border-white/30 -translate-y-2 bg-black/30 z-10"
                : "h-11 sm:h-13 md:h-14"
              }
            `}
          >
            <span
              className={`font-press-start leading-none whitespace-nowrap
                ${active
                  ? "text-[clamp(10px,2.5vw,18px)] text-white/80"
                  : "text-[clamp(6px,1.4vw,11px)] text-white/60"
                }
              `}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
