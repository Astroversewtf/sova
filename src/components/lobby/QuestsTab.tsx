"use client";

function QuestSlot() {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-4">
      <div className="w-10 h-10 bg-white border border-gray-200 rounded flex items-center justify-center">
        <span className="text-gray-300 text-lg">?</span>
      </div>
      <div className="flex-1">
        <div className="font-pixel text-xs text-gray-800">--</div>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gray-300 w-0" />
          </div>
          <span className="font-pixel text-[9px] text-gray-400">0/0</span>
        </div>
      </div>
      <button className="font-pixel text-[10px] px-4 py-2 rounded bg-gray-200 text-gray-400 cursor-default">
        GO
      </button>
    </div>
  );
}

export function QuestsTab() {
  const categories = [
    { key: "daily", label: "Daily", color: "text-blue-600" },
    { key: "weekly", label: "Weekly", color: "text-purple-600" },
    { key: "event", label: "Event", color: "text-pink-600" },
  ] as const;

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      {categories.map((cat) => (
        <div key={cat.key}>
          <h3 className={`font-pixel text-sm ${cat.color} mb-3 uppercase`}>
            {cat.label} Quests
          </h3>
          <div className="space-y-3">
            <QuestSlot />
            <QuestSlot />
          </div>
        </div>
      ))}
    </div>
  );
}
