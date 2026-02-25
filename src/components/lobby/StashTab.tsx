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
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <span className="font-pixel text-[10px] text-gray-400 uppercase">
          Total Earnings
        </span>
        <div className="font-pixel text-2xl text-gray-800 mt-1">
          {totalEarnings.toFixed(2)} AVAX
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <span className="font-pixel text-[9px] text-blue-600 uppercase">
            Weekly
          </span>
          <div className="font-pixel text-sm text-gray-800 mt-1">
            {weeklyEarnings.toFixed(2)} AVAX
          </div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <span className="font-pixel text-[9px] text-pink-600 uppercase">
            Jackpot
          </span>
          <div className="font-pixel text-sm text-gray-800 mt-1">
            {jackpotEarnings.toFixed(2)} AVAX
          </div>
        </div>
      </div>

      <button className="w-full bg-green-600 hover:bg-green-500 text-white font-pixel text-sm py-3 rounded-lg transition-all">
        CLAIM REWARDS
      </button>

      <div>
        <h4 className="font-pixel text-[10px] text-gray-400 uppercase mb-2">
          Weekly Breakdown
        </h4>
        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-center">
          <span className="font-pixel text-[10px] text-gray-300">
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
          className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center"
        >
          <div className="w-12 h-12 rounded mx-auto mb-2 bg-white border border-gray-200" />
          <div className="font-pixel text-[10px] text-gray-300">--</div>
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
          className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center"
        >
          <div className="w-10 h-10 rounded mx-auto mb-1 bg-white border border-gray-200 flex items-center justify-center">
            <span className="text-gray-300 text-sm">?</span>
          </div>
          <div className="font-pixel text-[10px] text-gray-300">--</div>
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
            className={`font-pixel text-[10px] px-4 py-2 rounded transition-all uppercase ${
              activeStashSubTab === tab.id
                ? "bg-gray-900 text-white"
                : "bg-gray-50 text-gray-400 hover:text-gray-600 border border-gray-200"
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
