import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";
import type { RunStats } from "../types";
import { useGameStore } from "@/stores/gameStore";

interface RunEndData {
  stats: RunStats;
  floor: number;
}

type Phase = "chest" | "opening" | "done";

/**
 * MoG-style multi-phase run end ceremony:
 *
 * Phase 0 — GAME OVER text (fade in, hold, fade out)
 *
 * Phase 1 — CHEST (3 clicks to open)
 *   Black screen, golden particles rising, chest drops with bounce,
 *   "CLICK ANYWHERE" pulsing. Each click shakes harder + more particles.
 *
 * Phase 2 — OPENING (after 3rd click)
 *   Chest bursts open with flash → hand off to React for loot reveals
 *
 * React handles: COINS → TICKETS → ORBS → LOOT SUMMARY
 */
export class RunEndScene extends Phaser.Scene {
  private stats!: RunStats;
  private floor!: number;
  private clickCount = 0;
  private phase: Phase = "chest";
  private ambientTimer?: Phaser.Time.TimerEvent;
  private chest!: Phaser.GameObjects.Image;
  private chestCx!: number;
  private chestCy!: number;
  private clickLabel!: Phaser.GameObjects.Text;
  private inputBlocked = false;
  private hasChestWood = false;

  constructor() {
    super({ key: "RunEndScene" });
  }

  create(data: RunEndData) {
    this.stats = data.stats;
    this.floor = data.floor;
    this.clickCount = 0;
    this.phase = "chest";
    this.inputBlocked = false;
    this.hasChestWood = this.textures.exists("chest-wood");

    this.cameras.main.setBackgroundColor(0x000000);

    // Hide the React HUD immediately
    useGameStore.setState({ isRunning: false });

    // Phase 0: "GAME OVER" text first, then chest
    this.phaseGameOver();
  }

  // ═══════════════════════════════════════════════════════
  //  PHASE 0 — GAME OVER text
  // ═══════════════════════════════════════════════════════

  private phaseGameOver() {
    const cx = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;
    const fontSize = 32;
    const padX = 14;
    const padY = 10;
    const gap = 8;

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
    const startX = cx - totalW / 2;

    gameText.setPosition(startX + w1 / 2, centerY);
    overText.setPosition(startX + w1 + gap + w2 / 2, centerY);

    const boxGfx = this.add.graphics().setAlpha(0);
    boxGfx.lineStyle(3, 0xffffff, 1);
    boxGfx.strokeRect(startX, centerY - boxH / 2, w1, boxH);
    boxGfx.strokeRect(startX + w1 + gap, centerY - boxH / 2, w2, boxH);

    const group = [gameText, overText, boxGfx];

    this.tweens.add({
      targets: group,
      alpha: 1,
      duration: 1200,
      delay: 300,
      ease: "Power1",
      onComplete: () => {
        this.time.delayedCall(1500, () => {
          this.tweens.add({
            targets: group,
            alpha: 0,
            duration: 500,
            onComplete: () => {
              group.forEach((o) => o.destroy());
              this.phaseChest();
            },
          });
        });
      },
    });
  }

  // ═══════════════════════════════════════════════════════
  //  PHASE 1 — CHEST (3 clicks)
  // ═══════════════════════════════════════════════════════

  private phaseChest() {
    const cx = GAME_WIDTH / 2;

    // Ambient golden particles rising from bottom
    this.startAmbientParticles(6);

    // No WEEKLY/JACKPOT labels — clean screen

    // ── Chest ──
    this.chestCx = cx;
    this.chestCy = GAME_HEIGHT / 2 - 30;

    if (this.hasChestWood) {
      this.chest = this.add
        .image(cx, -100, "chest-wood")
        .setScale(4)
        .setOrigin(0.5);
    } else if (this.textures.exists("loot-box-1")) {
      this.chest = this.add
        .image(cx, -100, "loot-box-1")
        .setScale(5)
        .setOrigin(0.5);
    } else {
      // Fallback — use a placeholder image-like object
      this.chest = this.add
        .image(cx, -100, "__DEFAULT")
        .setScale(1)
        .setOrigin(0.5);
    }

    // Bounce-drop
    this.tweens.add({
      targets: this.chest,
      y: this.chestCy,
      duration: 800,
      ease: "Bounce.easeOut",
      onComplete: () => this.startIdleBounce(),
    });

    // ── "CLICK ANYWHERE" pulsing — higher up (40% from top) ──
    this.clickLabel = this.add
      .text(cx, GAME_HEIGHT * 0.78, "CLICK ANYWHERE", {
        fontFamily: '"8bit Wonder"',
        fontSize: "10px",
        color: "#94a3b8",
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: this.clickLabel,
      alpha: { from: 0.3, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // ── Click handler ──
    this.input.on("pointerdown", this.handleClick, this);
  }

  private startIdleBounce() {
    this.tweens.add({
      targets: this.chest,
      y: this.chestCy - 8,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private handleClick = () => {
    if (this.inputBlocked) return;

    if (this.phase === "chest") {
      this.clickCount++;

      // Stop idle bounce
      this.tweens.killTweensOf(this.chest);
      this.chest.y = this.chestCy;

      // Burst particles from chest centre
      this.spawnBurstParticles(6 + this.clickCount * 6);

      // Shake with increasing intensity
      const amp = 2 + this.clickCount * 3;
      const reps = 3 + this.clickCount * 2;

      this.inputBlocked = true;
      this.tweens.add({
        targets: this.chest,
        x: {
          from: this.chestCx - amp,
          to: this.chestCx + amp,
        },
        duration: 40,
        yoyo: true,
        repeat: reps,
        ease: "Sine.easeInOut",
        onComplete: () => {
          this.chest.x = this.chestCx;
          this.inputBlocked = false;

          if (this.clickCount >= 3) {
            this.phase = "opening";
            this.time.delayedCall(300, () => this.openChest());
          } else {
            // Intensify ambient particles
            this.startAmbientParticles(6 + this.clickCount * 4);
            this.startIdleBounce();
          }
        },
      });
    }
  };

  // ═══════════════════════════════════════════════════════
  //  PHASE 2 — Chest opens, hand off to React
  // ═══════════════════════════════════════════════════════

  private openChest() {
    // Remove click handler and label
    this.input.off("pointerdown", this.handleClick, this);
    if (this.clickLabel) {
      this.clickLabel.destroy();
    }

    // Flash
    const flash = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0xffd819,
      0,
    );
    this.tweens.add({
      targets: flash,
      fillAlpha: { from: 0.6, to: 0 },
      duration: 500,
      ease: "Power2",
      onComplete: () => flash.destroy(),
    });

    // Switch to open chest (use loot-box-2 if available, otherwise keep same)
    if (this.textures.exists("loot-box-2")) {
      this.chest.setTexture("loot-box-2");
    }

    // Big burst
    this.spawnBurstParticles(40);

    // Scale pulse (chest bursts open — expand then settle)
    const baseScale = this.hasChestWood ? 4 : 5;
    this.tweens.add({
      targets: this.chest,
      scaleX: { from: baseScale * 1.4, to: baseScale },
      scaleY: { from: baseScale * 1.4, to: baseScale },
      duration: 400,
      ease: "Back.easeOut",
    });

    // Transition to React loot reveal after a beat
    this.time.delayedCall(800, () => {
      // Clean up all Phaser visuals before React takes over
      if (this.ambientTimer) {
        this.ambientTimer.destroy();
        this.ambientTimer = undefined;
      }
      this.tweens.killAll();
      this.children.removeAll(true);

      // Hand off to React — coins → orbs → summary
      useGameStore.getState().startLootReveal({
        stats: this.stats,
        floor: this.floor,
      });
    });
  }

  // ═══════════════════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════════════════

  /** Continuously spawn golden pixels rising from the bottom */
  private startAmbientParticles(rate: number) {
    if (this.ambientTimer) {
      this.ambientTimer.destroy();
    }

    this.ambientTimer = this.time.addEvent({
      delay: Math.max(30, Math.floor(1000 / rate)),
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(100, GAME_WIDTH - 100);
        const size = 2 + Math.random() * 2;
        const colors = [0xffd819, 0xfbbf24, 0xffa500, 0xffec4f];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const p = this.add.graphics();
        p.fillStyle(color, 0.7 + Math.random() * 0.3);
        p.fillRect(-size / 2, -size / 2, size, size);
        p.setPosition(x, GAME_HEIGHT + 10);

        this.tweens.add({
          targets: p,
          y: -20,
          x: x + Phaser.Math.Between(-40, 40),
          alpha: 0,
          duration: 2000 + Math.random() * 1500,
          ease: "Power1",
          onComplete: () => p.destroy(),
        });
      },
    });
  }

  /** Burst particles outward from chest centre */
  private spawnBurstParticles(
    count: number,
    color1 = 0xffd819,
    color2 = 0xffa500,
  ) {
    const cx = this.chestCx;
    const cy = this.chestCy;

    for (let i = 0; i < count; i++) {
      const color = Math.random() > 0.5 ? color1 : color2;
      const size = 2 + Math.random() * 3;
      const p = this.add.graphics();
      p.fillStyle(color, 0.9);
      p.fillRect(-size / 2, -size / 2, size, size);
      p.setPosition(cx, cy);

      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 100;
      const tx = cx + Math.cos(angle) * speed;
      const ty = cy + Math.sin(angle) * speed - 30;

      this.tweens.add({
        targets: p,
        x: tx,
        y: ty,
        alpha: 0,
        duration: 500 + Math.random() * 400,
        delay: Math.random() * 150,
        ease: "Power2",
        onComplete: () => p.destroy(),
      });
    }
  }
}
