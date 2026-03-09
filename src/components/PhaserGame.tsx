"use client";

import { useEffect, useRef } from "react";
import { useWalletStore } from "@/stores/walletStore";
import { GameHUD } from "./GameHUD";
import { UpgradeOverlay } from "./UpgradeOverlay";
import { LootRevealOverlay } from "./LootRevealOverlay";
import { GameOverOverlay } from "./GameOverOverlay";

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

      // Force custom cursor on Phaser canvas
      game.events.once("ready", () => {
        const canvas = game.canvas;
        if (canvas) {
          canvas.style.setProperty(
            "cursor",
            "url('/sprites/ui/cursor/cursor_arrow_01.png') 0 0, url('/sprites/ui/cursor/cursor_hand_01.png') 6 0, auto",
            "important",
          );
        }
      });

      game.events.on("go-to-lobby", () => {
        setView("lobby");
      });

      // Game Over overlay actions (React → Phaser)
      const handleRunEndAction = (e: Event) => {
        const action = (e as CustomEvent).detail;
        const g = gameRef.current;
        if (!g) return;

        // Stop RunEndScene
        if (g.scene.isActive("RunEndScene")) g.scene.stop("RunEndScene");

        if (action === "play-again") {
          g.scene.start("GameScene");
        } else if (action === "lobby") {
          g.events.emit("go-to-lobby");
        }
      };
      window.addEventListener("sova:run-end-action", handleRunEndAction);

      // Store cleanup ref for teardown
      (game as unknown as Record<string, unknown>).__runEndHandler = handleRunEndAction;
    };

    init();

    return () => {
      cancelled = true;
      if (gameRef.current) {
        const handler = (gameRef.current as unknown as Record<string, unknown>).__runEndHandler as EventListener | undefined;
        if (handler) window.removeEventListener("sova:run-end-action", handler);
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
      <UpgradeOverlay />
      <LootRevealOverlay />
      <GameOverOverlay />
    </div>
  );
}
