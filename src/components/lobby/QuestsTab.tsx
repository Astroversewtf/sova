"use client";

export function QuestsTab() {
  const categories = [
    { key: "daily", label: "DAILY", border: "border-[#32506f]", bg: "bg-[#0e1c2b]", text: "text-[#6fb6ff]" },
    { key: "weekly", label: "WEEKLY", border: "border-[#6a4060]", bg: "bg-[#241022]", text: "text-[#ff7ac7]" },
    { key: "event", label: "EVENT", border: "border-[#5f4e2b]", bg: "bg-[#221d0f]", text: "text-[#e5c87a]" },
  ] as const;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-[760px] space-y-4">
        <h3 className="font-pixel text-sm text-white uppercase text-outline">QUESTS</h3>

      {categories.map((cat) => (
          <div key={cat.key} className={`rounded-md border ${cat.border} ${cat.bg} p-4`}>
            <h4 className={`font-pixel text-xs ${cat.text} uppercase text-outline`}>{cat.label}</h4>
            <div className="mt-3 rounded-md border border-[#2d3642] bg-[#101721] p-4 text-center">
              <span className="font-pixel text-[10px] text-[#9fb0c3] text-outline">NO QUESTS YET.</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
