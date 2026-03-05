"use client";

import { useLobbyStore, type StashSubTab } from "@/stores/lobbyStore";
import { usePlayerStore } from "@/stores/playerStore";

const subTabs: { id: StashSubTab; label: string }[] = [
  { id: "earnings", label: "Earnings" },
  { id: "skins", label: "Skins" },
  { id: "items", label: "Items" },
];

function EarningsContent() {
  const { totalEarnings, weeklyEarnings, jackpotEarnings } = usePlayerStore();

  return (
    <div className="space-y-4">
      <div className="bg-black/40 border border-white/10 rounded-lg p-4 text-center backdrop-blur-sm">
        <span className="font-pixel text-[10px] text-gray-400 uppercase text-outline">
          Total Earnings
        </span>
        <div className="font-pixel text-2xl text-white mt-1 text-outline">
          {totalEarnings.toFixed(2)} USD
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-black/40 border border-white/10 rounded-lg p-3 backdrop-blur-sm">
          <span className="font-pixel text-[9px] text-blue-400 uppercase text-outline">
            Weekly
          </span>
          <div className="font-pixel text-sm text-white mt-1 text-outline">
            {weeklyEarnings.toFixed(2)} USD
          </div>
        </div>
        <div className="bg-black/40 border border-white/10 rounded-lg p-3 backdrop-blur-sm">
          <span className="font-pixel text-[9px] text-pink-400 uppercase text-outline">
            Jackpot
          </span>
          <div className="font-pixel text-sm text-white mt-1 text-outline">
            {jackpotEarnings.toFixed(2)} USD
          </div>
        </div>
      </div>

      <button className="w-full bg-[#b8e550] hover:bg-[#c5ed65] text-white font-pixel text-sm py-3 rounded-lg transition-all text-outline">
        CLAIM REWARDS
      </button>

      <div>
        <h4 className="font-pixel text-[10px] text-gray-400 uppercase mb-2 text-outline">
          Weekly Breakdown
        </h4>
        <div className="bg-black/40 border border-white/10 rounded p-3 text-center backdrop-blur-sm">
          <span className="font-pixel text-[10px] text-gray-500">
            No weekly data yet
          </span>
        </div>
      </div>
    </div>
  );
}

function SkinsContent() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-black/40 border border-white/10 rounded-lg p-3 text-center backdrop-blur-sm"
        >
          <div className="w-12 h-12 rounded mx-auto mb-2 bg-white/10 border border-white/10" />
          <div className="font-pixel text-[10px] text-gray-500">--</div>
        </div>
      ))}
    </div>
  );
}

function ItemsContent() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-black/40 border border-white/10 rounded-lg p-3 text-center backdrop-blur-sm"
        >
          <div className="w-10 h-10 rounded mx-auto mb-1 bg-white/10 border border-white/10 flex items-center justify-center">
            <span className="text-gray-500 text-sm">?</span>
          </div>
          <div className="font-pixel text-[10px] text-gray-500">--</div>
        </div>
      ))}
    </div>
  );
}

export function StashTab() {
  const { activeStashSubTab, setStashSubTab } = useLobbyStore();

  return (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex gap-2 mb-4">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStashSubTab(tab.id)}
            className={`font-pixel text-[10px] px-4 py-2 rounded transition-all uppercase text-outline ${
              activeStashSubTab === tab.id
                ? "bg-white/20 text-white"
                : "bg-black/30 text-gray-500 hover:text-gray-300 border border-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeStashSubTab === "earnings" && <EarningsContent />}
      {activeStashSubTab === "skins" && <SkinsContent />}
      {activeStashSubTab === "items" && <ItemsContent />}
    </div>
  );
}
