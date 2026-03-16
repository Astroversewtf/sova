"use client";

export function LobbySpotlightBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black pointer-events-none">
      <div className="absolute inset-0 lobby-geometric-bg" />
      <div className="absolute inset-0 bg-black/22" />
    </div>
  );
}
