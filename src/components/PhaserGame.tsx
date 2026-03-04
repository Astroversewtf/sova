"use client";

import { useEffect, useRef } from "react";
import { useWalletStore } from "@/stores/walletStore";
import { GameHUD } from "./GameHUD";

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const setView = useWalletStore((s) => s.setView);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!containerRef.current) return;

      // Destroy any leftover instance (StrictMode double-mount)
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }

      const Phaser = (await import("phaser")).default;
      const { createGameConfig } = await import("@/game/config");

      if (cancelled || !containerRef.current) return;

      // Clear container in case previous canvas is still in DOM
      containerRef.current.innerHTML = "";

      const config = createGameConfig(containerRef.current);
      const game = new Phaser.Game(config);
      gameRef.current = game;

      game.events.on("go-to-lobby", () => {
        setView("lobby");
      });
    };

    init();

    return () => {
      cancelled = true;
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [setView]);

  return (
    <div className="relative w-full h-full bg-black">
      <div ref={containerRef} className="absolute inset-0" />
      <GameHUD />
    </div>
  );
}
