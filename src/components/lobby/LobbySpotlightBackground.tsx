"use client";

export function LobbySpotlightBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black pointer-events-none">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: "url('/images/onboarding-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: "brightness(0.6)",
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}
