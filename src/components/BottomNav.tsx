"use client";

import { useLobbyStore, type LobbyTab } from "@/stores/lobbyStore";
import { OverlayFrame } from "@/components/OverlayFrame";

type LeftNavItem = {
  id: LobbyTab | "guide";
  label: string;
};

const leftItems: LeftNavItem[] = [
  { id: "home", label: "HOME" },
  { id: "stash", label: "STASH" },
  { id: "rankings", label: "LEADERBOARD" },
  { id: "shop", label: "SHOP" },
  { id: "guide", label: "GUIDE" },
];

function SquareNavButton({
  label,
  active = false,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center"
    >
      <img
        src="/sprites/ui/onboarding/square_button_01.png"
        alt=""
        className={`absolute inset-0 w-full h-full ${active ? "opacity-100" : "opacity-90"}`}
        style={{ imageRendering: "pixelated" }}
      />
      <span className={`font-pixel text-[8px] ${active ? "text-white" : "text-white/80"}`}>
        {label[0]}
      </span>
    </button>
  );
}

export function BottomNav() {
  const { activeTab, setActiveTab } = useLobbyStore();

  return (
    <div className="pointer-events-none absolute inset-y-0 left-6 right-8 z-30 flex items-center justify-between">
      <div className="pointer-events-auto">
        <OverlayFrame
          className="w-[92px] h-[390px]"
          contentClassName="h-full w-full"
          edge={16}
          innerEdge={10}
        >
          <div className="h-full w-full flex flex-col items-center justify-between py-3">
            {leftItems.map((item) => {
              const isTab = item.id !== "guide";
              const active = isTab ? activeTab === item.id : false;
              return (
                <SquareNavButton
                  key={item.id}
                  label={item.label}
                  active={active}
                  onClick={isTab ? () => setActiveTab(item.id as LobbyTab) : undefined}
                />
              );
            })}
          </div>
        </OverlayFrame>
      </div>

      <div className="pointer-events-auto mr-2">
        <OverlayFrame
          className="w-[92px] h-[122px]"
          contentClassName="h-full w-full"
          edge={16}
          innerEdge={10}
        >
          <div className="h-full w-full flex items-center justify-center">
            <SquareNavButton
              label="QUESTS"
              active={activeTab === "quests"}
              onClick={() => setActiveTab("quests")}
            />
          </div>
        </OverlayFrame>
      </div>
    </div>
  );
}
