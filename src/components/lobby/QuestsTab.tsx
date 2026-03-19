"use client";

/*
  QUESTS TAB — placeholder wireframe matching sketch (page 6).
  Layout: [0 / 50] progress + [prize], then 3 quest row placeholders.
  Replace border boxes with themed art when ready.
*/
export function QuestsTab() {
  return (
    <div className="h-full flex flex-col items-center px-2 pt-4 sm:pt-6">
      <div className="w-full max-w-[500px] flex flex-col gap-3 sm:gap-4">
        {/* Progress bar + prize */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex-1 border-2 border-white/30 h-10 sm:h-12 flex items-center justify-center">
            <span className="font-press-start text-[clamp(10px,2.5vw,18px)] text-white/60">0 / 50</span>
          </div>
          <div className="border-2 border-white/30 h-10 sm:h-12 px-4 sm:px-6 flex items-center justify-center">
            <span className="font-press-start text-[clamp(6px,1.4vw,10px)] text-white/50">prize</span>
          </div>
        </div>

        {/* Quest rows */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="border-2 border-white/30 h-20 sm:h-24 flex items-center justify-center">
            <span className="font-press-start text-[clamp(6px,1.3vw,9px)] text-white/30">quest placeholder</span>
          </div>
        ))}
      </div>
    </div>
  );
}
