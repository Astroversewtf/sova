"use client";

export function LobbySpotlightBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black pointer-events-none">
      <div
        className="absolute inset-0 animate-lobby-attic-seq-0"
        style={{
          backgroundImage: "url('/images/lobby-attic-entrance2.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated"
        }}
      />
      <div
        className="absolute inset-0 animate-lobby-attic-seq-1"
        style={{
          backgroundImage: "url('/images/lobby-attic-entrance1.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated"
        }}
      />
      <div
        className="absolute inset-0 animate-lobby-attic-seq-2"
        style={{
          backgroundImage: "url('/images/lobby-attic-entrance-export.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          imageRendering: "pixelated"
        }}
      />
    </div>
  );
}
