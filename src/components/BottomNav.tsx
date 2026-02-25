"use client";

import { useLobbyStore, type LobbyTab } from "@/stores/lobbyStore";

const tabs: { id: LobbyTab; label: string; icon: string }[] = [
  { id: "home", label: "Home", icon: "🏠" },
  { id: "shop", label: "Shop", icon: "🛒" },
  { id: "quests", label: "Quests", icon: "📜" },
  { id: "rankings", label: "Rankings", icon: "🏆" },
  { id: "stash", label: "Stash", icon: "💰" },
];

export function BottomNav() {
  const { activeTab, setActiveTab } = useLobbyStore();

  return (
    <div className="h-16 bg-gray-50 border-t border-gray-200 flex items-center justify-around shrink-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors ${
            activeTab === tab.id
              ? "text-gray-900"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <span className="text-lg">{tab.icon}</span>
          <span className="text-[10px] font-pixel uppercase">{tab.label}</span>
          {activeTab === tab.id && (
            <div className="w-1 h-1 rounded-full bg-gray-900" />
          )}
        </button>
      ))}
    </div>
  );
}
