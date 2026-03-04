"use client";

import { useLobbyStore, type LobbyTab } from "@/stores/lobbyStore";

const tabs: { id: LobbyTab; label: string; icon: string }[] = [
  { id: "stash", label: "Stash", icon: "💰" },
  { id: "shop", label: "Shop", icon: "🛒" },
  { id: "home", label: "Home", icon: "🏠" },
  { id: "quests", label: "Quests", icon: "📜" },
  { id: "rankings", label: "Rankings", icon: "🏆" },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useLobbyStore();

  return (
    <div className="flex justify-center py-3 shrink-0">
      <div className="flex items-end gap-0 bg-[#1a2332]/90 backdrop-blur-sm rounded-xl border border-white/10 px-1 py-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-4 sm:px-5 py-2 rounded-lg transition-all min-w-0 ${
                isActive
                  ? "bg-white/10 -mt-2"
                  : "hover:bg-white/5"
              }`}
            >
              <span className={`text-xl transition-transform ${isActive ? "scale-125 -translate-y-1" : ""}`}>
                {tab.icon}
              </span>
              {isActive && (
                <span className="font-pixel text-[8px] text-white uppercase text-outline">
                  {tab.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
