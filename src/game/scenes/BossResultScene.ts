import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT, C } from "../constants";

interface BossResultData {
  floor: number;
  onContinue: () => void;
}

export class BossResultScene extends Phaser.Scene {
  private setCanvasCursor(mode: "default" | "hand") {
    const canvas = this.game.canvas as HTMLCanvasElement | null;
    if (!canvas) return;
    const cursor = mode === "hand"
      ? "url('/sprites/ui/cursor/cursor_hand_01.png') 6 0, url('/sprites/ui/cursor/cursor_arrow_01.png') 0 0, pointer"
      : "url('/sprites/ui/cursor/cursor_arrow_01.png') 0 0, url('/sprites/ui/cursor/cursor_hand_01.png') 6 0, auto";
    canvas.style.setProperty("cursor", cursor, "important");
  }

  constructor() {
    super({ key: "BossResultScene" });
  }

  create(data: BossResultData) {
    this.input.setDefaultCursor(
      "url('/sprites/ui/cursor/cursor_arrow_01.png') 0 0, url('/sprites/ui/cursor/cursor_hand_01.png') 6 0, auto",
    );
    this.setCanvasCursor("default");

    const { floor, onContinue } = data;

    // Dim overlay
    this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.85,
    );

    // Title
    this.add
      .text(GAME_WIDTH / 2, 100, "SOVA DEFEATED!", {
        fontFamily: '"8bit Wonder"',
        fontSize: "18px",
        color: "#a78bfa",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Jackpot tier
    const tiers = ["Minor Jackpot", "Major Jackpot", "MEGA JACKPOT"];
    const colors = ["#c4b5fd", "#fbbf24", "#ef4444"];
    const sizes = ["12px", "14px", "18px"];
    const roll = Math.random();
    const tierIdx = roll < 0.7 ? 0 : roll < 0.95 ? 1 : 2;

    // Jackpot badge
    const badgeG = this.add.graphics();
    const badgeColor = tierIdx === 2 ? 0x991b1b : tierIdx === 1 ? 0x854d0e : 0x4c1d95;
    badgeG.fillStyle(badgeColor, 0.8);
    badgeG.fillRoundedRect(GAME_WIDTH / 2 - 100, 148, 200, 40, 6);
    badgeG.lineStyle(2, tierIdx === 2 ? 0xef4444 : tierIdx === 1 ? 0xfbbf24 : 0x8b5cf6, 0.8);
    badgeG.strokeRoundedRect(GAME_WIDTH / 2 - 100, 148, 200, 40, 6);

    this.add
      .text(GAME_WIDTH / 2, 168, tiers[tierIdx], {
        fontFamily: '"8bit Wonder"',
        fontSize: sizes[tierIdx],
        color: colors[tierIdx],
      })
      .setOrigin(0.5);

    // Floor info
    this.add
      .text(GAME_WIDTH / 2, 210, `Floor ${floor} Boss`, {
        fontFamily: '"8bit Wonder"',
        fontSize: "8px",
        color: "#94a3b8",
      })
      .setOrigin(0.5);

    // Sparkle effect for mega jackpot
    if (tierIdx === 2) {
      for (let i = 0; i < 8; i++) {
        const star = this.add
          .text(
            GAME_WIDTH / 2 + (Math.random() - 0.5) * 200,
            140 + Math.random() * 60,
            "*",
            {
              fontFamily: '"8bit Wonder"',
              fontSize: "10px",
              color: "#fbbf24",
            },
          )
          .setOrigin(0.5)
          .setAlpha(0);

        this.tweens.add({
          targets: star,
          alpha: { from: 0, to: 1 },
          scaleX: { from: 0, to: 1.5 },
          scaleY: { from: 0, to: 1.5 },
          duration: 400,
          delay: i * 100,
          yoyo: true,
          repeat: -1,
        });
      }
    }

    // Continue button
    const btnBg = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 90, 140, 36, 0x16a34a, 0.9)
      .setStrokeStyle(1, 0x22c55e)
      .setInteractive();

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 90, "CONTINUE", {
        fontFamily: '"8bit Wonder"',
        fontSize: "10px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    btnBg.on("pointerover", () => {
      btnBg.setFillStyle(0x22c55e, 1);
      this.setCanvasCursor("hand");
    });
    btnBg.on("pointerout", () => {
      btnBg.setFillStyle(0x16a34a, 0.9);
      this.setCanvasCursor("default");
    });
    btnBg.on("pointerdown", () => {
      this.setCanvasCursor("default");
      this.scene.stop();
      onContinue();
    });

    this.events.once("shutdown", () => this.setCanvasCursor("default"));
  }
}
