"use client";

import { OverlayFrame } from "@/components/OverlayFrame";

export function QuestsTab() {
  const categories = [
    { key: "daily", label: "DAILY", color: "text-[#6fb6ff]" },
    { key: "weekly", label: "WEEKLY", color: "text-[#ff7ac7]" },
    { key: "event", label: "EVENT", color: "text-[#e5c87a]" },
  ] as const;

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 w-full max-w-[400px]">
          <span className="font-pixel text-xs text-white text-outline uppercase">
            QUESTS
          </span>

          {categories.map((cat) => (
            <OverlayFrame
              key={cat.key}
              className="w-full h-[72px]"
              contentClassName="flex items-center justify-between px-4 !p-0"
              namePrefix="square"
              edge={16}
              innerEdge={16}
            >
              <div className="flex items-center gap-3 pl-4">
                <span className={`font-pixel text-[11px] ${cat.color} uppercase text-outline`}>
                  {cat.label}
                </span>
              </div>
              <span className="font-pixel text-[10px] text-[#7f8da3] text-outline pr-4">
                NO QUESTS YET
              </span>
            </OverlayFrame>
          ))}
        </div>
      </div>
    </div>
  );
}
