import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";
import type { RunStats } from "../types";
import { useGameStore } from "@/stores/gameStore";

interface RunEndData {
  stats: RunStats;
  floor: number;
}

export class RunEndScene extends Phaser.Scene {
  private stats!: RunStats;
  private floor!: number;

  constructor() {
    super({ key: "RunEndScene" });
  }

  create(data: RunEndData) {
    this.stats = data.stats;
    this.floor = data.floor;

    // ── Phase 1: Slow fade to black + "GAME OVER" ──
    this.cameras.main.setBackgroundColor(0x000000);

    // Full black overlay, starts transparent, fades in
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0,
    );

    // "GAME OVER" — two boxed words like MoG style
    const centerY = GAME_HEIGHT / 2;
    const gap = 8;
    const padX = 14;
    const padY = 10;
    const fontSize = 32;

    // Create text objects first to measure them
    const gameText = this.add
      .text(0, 0, "GAME", {
        fontFamily: '"8bit Wonder"',
        fontSize: `${fontSize}px`,
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const overText = this.add
      .text(0, 0, "OVER", {
        fontFamily: '"8bit Wonder"',
        fontSize: `${fontSize}px`,
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const w1 = gameText.width + padX * 2;
    const w2 = overText.width + padX * 2;
    const boxH = fontSize + padY * 2;
    const totalW = w1 + gap + w2;

    const startX = GAME_WIDTH / 2 - totalW / 2;

    // Position text inside boxes
    gameText.setPosition(startX + w1 / 2, centerY);
    overText.setPosition(startX + w1 + gap + w2 / 2, centerY);

    // Draw boxes
    const boxGfx = this.add.graphics().setAlpha(0);
    // Box 1 — "GAME"
    boxGfx.lineStyle(3, 0xffffff, 1);
    boxGfx.strokeRect(startX, centerY - boxH / 2, w1, boxH);
    // Box 2 — "OVER"
    boxGfx.strokeRect(startX + w1 + gap, centerY - boxH / 2, w2, boxH);

    // Group all game-over elements for animation
    const gameOverGroup = [gameText, overText, boxGfx];

    // Fade overlay to black
    this.tweens.add({
      targets: overlay,
      fillAlpha: 1,
      duration: 1500,
      ease: "Power1",
    });

    // Fade in "GAME OVER"
    this.tweens.add({
      targets: gameOverGroup,
      alpha: 1,
      duration: 1200,
      delay: 800,
      ease: "Power1",
      onComplete: () => {
        // Hold for a moment, then transition to loot screen
        this.time.delayedCall(1800, () => {
          this.showLootScreen(gameOverGroup);
        });
      },
    });
  }

  private showLootScreen(gameOverGroup: (Phaser.GameObjects.Text | Phaser.GameObjects.Graphics)[]) {
    const { stats, floor } = this;

    // Fade out "GAME OVER" boxes
    this.tweens.add({
      targets: gameOverGroup,
      alpha: 0,
      duration: 500,
      ease: "Power2",
    });

    // Small title at top
    const titleText = this.add
      .text(GAME_WIDTH / 2, 30, "GAME OVER", {
        fontFamily: '"8bit Wonder"',
        fontSize: "14px",
        color: "#ef4444",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Floor reached badge
    const badgeG = this.add.graphics().setAlpha(0);
    badgeG.fillStyle(0x1e3a5f, 0.9);
    badgeG.fillRoundedRect(GAME_WIDTH / 2 - 70, 70, 140, 24, 4);
    badgeG.lineStyle(1, 0x3b82f6, 0.6);
    badgeG.strokeRoundedRect(GAME_WIDTH / 2 - 70, 70, 140, 24, 4);

    const floorText = this.add
      .text(GAME_WIDTH / 2, 82, `FLOOR REACHED: ${floor}`, {
        fontFamily: '"8bit Wonder"',
        fontSize: "7px",
        color: "#93c5fd",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    // Stats panel
    const panelX = GAME_WIDTH / 2;
    const panelW = 280;
    const panelY = 110;

    const panelG = this.add.graphics().setAlpha(0);
    panelG.fillStyle(0x111827, 0.9);
    panelG.fillRoundedRect(panelX - panelW / 2, panelY, panelW, 250, 6);
    panelG.lineStyle(1, 0x374151, 0.6);
    panelG.strokeRoundedRect(panelX - panelW / 2, panelY, panelW, 250, 6);

    // Stat lines
    const statLines = [
      { label: "COINS", value: `${stats.coinsCollected}`, color: "#fbbf24" },
      { label: "GEMS", value: `${stats.gemsCollected}`, color: "#a78bfa" },
      { label: "GOLDEN TICKETS", value: `${stats.goldenTicketsCollected}`, color: "#fbbf24" },
      { label: "", value: "", color: "#374151" },
      { label: "TOTAL TREASURE", value: `${stats.totalTreasure} PTS`, color: "#fbbf24" },
      { label: "", value: "", color: "#374151" },
      { label: "ENEMIES KILLED", value: `${stats.enemiesKilled}`, color: "#ef4444" },
      { label: "BOSSES KILLED", value: `${stats.bossesKilled}`, color: "#8b5cf6" },
      { label: "", value: "", color: "#374151" },
      { label: "UPGRADES", value: `${stats.upgradesTaken.length}`, color: "#3b82f6" },
    ];

    const statTexts: Phaser.GameObjects.Text[] = [];
    const statDividers: Phaser.GameObjects.Graphics[] = [];

    statLines.forEach((line, i) => {
      const lineY = panelY + 20 + i * 22;
      if (line.label === "") {
        const divG = this.add.graphics().setAlpha(0);
        divG.fillStyle(0x374151, 0.5);
        divG.fillRect(panelX - panelW / 2 + 16, lineY + 8, panelW - 32, 1);
        statDividers.push(divG);
        return;
      }

      const labelText = this.add.text(panelX - panelW / 2 + 20, lineY, line.label, {
        fontFamily: '"8bit Wonder"',
        fontSize: "7px",
        color: "#9ca3af",
      }).setAlpha(0);

      const valueText = this.add
        .text(panelX + panelW / 2 - 20, lineY, line.value, {
          fontFamily: '"8bit Wonder"',
          fontSize: "7px",
          color: line.color,
        })
        .setOrigin(1, 0)
        .setAlpha(0);

      statTexts.push(labelText, valueText);
    });

    // Buttons
    const btnY = GAME_HEIGHT - 50;

    const playBg = this.add
      .rectangle(GAME_WIDTH / 2 - 90, btnY, 130, 32, 0x16a34a, 0.9)
      .setStrokeStyle(1, 0x22c55e)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    const playText = this.add
      .text(GAME_WIDTH / 2 - 90, btnY, "PLAY AGAIN", {
        fontFamily: '"8bit Wonder"',
        fontSize: "8px",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    playBg.on("pointerover", () => playBg.setFillStyle(0x22c55e, 1));
    playBg.on("pointerout", () => playBg.setFillStyle(0x16a34a, 0.9));
    playBg.on("pointerdown", () => {
      useGameStore.getState().endRun();
      this.scene.stop();
      this.scene.start("GameScene");
    });

    const lobbyBg = this.add
      .rectangle(GAME_WIDTH / 2 + 90, btnY, 100, 32, 0x374151, 0.9)
      .setStrokeStyle(1, 0x6b7280)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    const lobbyText = this.add
      .text(GAME_WIDTH / 2 + 90, btnY, "LOBBY", {
        fontFamily: '"8bit Wonder"',
        fontSize: "8px",
        color: "#d1d5db",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    lobbyBg.on("pointerover", () => lobbyBg.setFillStyle(0x4b5563, 1));
    lobbyBg.on("pointerout", () => lobbyBg.setFillStyle(0x374151, 0.9));
    lobbyBg.on("pointerdown", () => {
      useGameStore.getState().endRun();
      this.scene.stop();
      this.game.events.emit("go-to-lobby");
    });

    // ── Fade everything in ──
    const allElements = [
      titleText, badgeG, floorText, panelG,
      ...statTexts, ...statDividers,
      playBg, playText, lobbyBg, lobbyText,
    ];

    this.tweens.add({
      targets: allElements,
      alpha: 1,
      duration: 800,
      delay: 400,
      ease: "Power1",
    });
  }
}
