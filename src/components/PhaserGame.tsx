"use client";

import { useEffect, useRef } from "react";
import { useWalletStore } from "@/stores/walletStore";

export function PhaserGame() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const setView = useWalletStore((s) => s.setView);

  useEffect(() => {
    if (!gameContainerRef.current || gameRef.current) return;

    async function initGame() {
      const Phaser = (await import("phaser")).default;
      const { createGameConfig } = await import("@/game/config");

      if (!gameContainerRef.current) return;

      const rect = gameContainerRef.current.getBoundingClientRect();
      const config = createGameConfig(gameContainerRef.current, rect.width, rect.height);
      const game = new Phaser.Game(config);
      gameRef.current = game;

      game.events.on("go-to-lobby", () => {
        setView("lobby");
      });
    }

    initGame();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [setView]);

  return (
    <div className="w-full h-full" ref={gameContainerRef} />
  );
}
