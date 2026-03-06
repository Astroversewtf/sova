import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";
import type { RunStats } from "../types";
import { useGameStore } from "@/stores/gameStore";

interface RunEndData {
  stats: RunStats;
  floor: number;
}

type Phase = "chest" | "treasure" | "summary";

/**
 * Multi-phase run end ceremony:
 *
 * Phase 1 — CHEST
 *   Black screen, golden particles rising, chest drops with bounce,
 *   "CLICK ANYWHERE" pulsing at bottom. Each of 3 clicks shakes the
 *   chest harder and intensifies particles.
 *
 * Phase 2 — TREASURE (auto-plays after 3rd click)
 *   Chest opens with flash, "TREASURE" label, coin count-up, orb count-up.
 *   Then "CLICK TO CONTINUE" appears.
 *
 * Phase 3 — SUMMARY (after click)
 *   Fade to dimmed overlay with GAME OVER title, LOOT section,
 *   STATS section, PLAY AGAIN + LOBBY buttons.
 */
export class RunEndScene extends Phaser.Scene {
  private stats!: RunStats;
  private floor!: number;
  private clickCount = 0;
  private phase: Phase = "chest";
  private ambientTimer?: Phaser.Time.TimerEvent;
  private chest!: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
  private chestCx!: number;
  private chestCy!: number;
  private clickLabel!: Phaser.GameObjects.Text;
  private isChestSprite = false;
  private inputBlocked = false;

  constructor() {
    super({ key: "RunEndScene" });
  }

  create(data: RunEndData) {
    this.stats = data.stats;
    this.floor = data.floor;
    this.clickCount = 0;
    this.phase = "chest";
    this.inputBlocked = false;

    this.cameras.main.setBackgroundColor(0x000000);

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

    // ── Top labels ──
    this.add
      .text(cx - 140, 50, "WEEKLY POOL", {
        fontFamily: '"8bit Wonder"',
        fontSize: "7px",
        color: "#64748b",
      })
      .setOrigin(0.5);

    this.add
      .text(cx - 140, 72, "1,250", {
        fontFamily: '"8bit Wonder"',
        fontSize: "12px",
        color: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add
      .text(cx + 140, 50, "JACKPOT", {
        fontFamily: '"8bit Wonder"',
        fontSize: "7px",
        color: "#64748b",
      })
      .setOrigin(0.5);

    this.add
      .text(cx + 140, 72, "5,000", {
        fontFamily: '"8bit Wonder"',
        fontSize: "12px",
        color: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // ── Chest ──
    this.chestCx = cx;
    this.chestCy = GAME_HEIGHT / 2 - 30;

    this.isChestSprite = this.textures.exists("loot-box-1");

    if (this.isChestSprite) {
      const img = this.add
        .image(cx, -100, "loot-box-1")
        .setScale(5)
        .setOrigin(0.5);
      this.chest = img;
    } else {
      const g = this.add.graphics();
      this.drawChestClosed(g, cx, -100);
      this.chest = g;
    }

    // Bounce-drop
    this.tweens.add({
      targets: this.chest,
      y: this.isChestSprite ? this.chestCy : this.chestCy + 100,
      duration: 800,
      ease: "Bounce.easeOut",
      onComplete: () => this.startIdleBounce(),
    });

    // ── "CLICK ANYWHERE" pulsing ──
    this.clickLabel = this.add
      .text(cx, GAME_HEIGHT - 60, "CLICK ANYWHERE", {
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
      y: (this.isChestSprite ? this.chestCy : this.chestCy + 100) - 8,
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
      const restY = this.isChestSprite ? this.chestCy : this.chestCy + 100;
      (this.chest as Phaser.GameObjects.Components.Transform).y = restY;

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
          (this.chest as Phaser.GameObjects.Components.Transform).x =
            this.chestCx;
          this.inputBlocked = false;

          if (this.clickCount >= 3) {
            this.phase = "treasure";
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
  //  PHASE 2 — TREASURE (auto-plays)
  // ═══════════════════════════════════════════════════════

  private openChest() {
    // Remove click label
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

    // Switch to open chest
    if (this.isChestSprite && this.textures.exists("loot-box-2")) {
      (this.chest as Phaser.GameObjects.Image).setTexture("loot-box-2");
    } else if (!this.isChestSprite) {
      const g = this.chest as Phaser.GameObjects.Graphics;
      g.clear();
      this.drawChestOpen(g, this.chestCx, this.chestCy);
    }

    // Big burst
    this.spawnBurstParticles(40);

    // Scale pulse
    this.tweens.add({
      targets: this.chest,
      scaleX: this.isChestSprite ? { from: 6.5, to: 5 } : { from: 1.3, to: 1 },
      scaleY: this.isChestSprite ? { from: 6.5, to: 5 } : { from: 1.3, to: 1 },
      duration: 400,
      ease: "Back.easeOut",
    });

    // "TREASURE" label above chest
    const cx = GAME_WIDTH / 2;
    const treasureLabel = this.add
      .text(cx, this.chestCy - 100, "TREASURE", {
        fontFamily: '"8bit Wonder"',
        fontSize: "18px",
        color: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: treasureLabel,
      alpha: 1,
      y: treasureLabel.y + 12,
      duration: 500,
      ease: "Power2",
    });

    // Count-up coins after a beat
    this.time.delayedCall(700, () => this.revealCoins());
  }

  private revealCoins() {
    const cx = GAME_WIDTH / 2;
    const baseY = this.chestCy + 80;

    // Gold burst
    this.spawnBurstParticles(14, 0xfbbf24, 0xffa500);

    const label = this.add
      .text(cx, baseY, "COINS", {
        fontFamily: '"8bit Wonder"',
        fontSize: "8px",
        color: "#9ca3af",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const value = this.add
      .text(cx, baseY + 26, "0", {
        fontFamily: '"8bit Wonder"',
        fontSize: "22px",
        color: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: [label, value],
      alpha: 1,
      duration: 300,
    });

    const target = this.stats.coinsCollected;
    const dur = Math.min(1500, Math.max(500, target * 30));

    this.tweens.addCounter({
      from: 0,
      to: target,
      duration: dur,
      ease: "Power1",
      onUpdate: (tw) => value.setText(`${Math.floor(tw.getValue() ?? 0)}`),
      onComplete: () => {
        value.setText(`${target}`);
        this.time.delayedCall(500, () => this.revealOrbs(baseY));
      },
    });
  }

  private revealOrbs(coinsBaseY: number) {
    const cx = GAME_WIDTH / 2;
    const baseY = coinsBaseY + 56;

    // Purple burst
    this.spawnBurstParticles(10, 0xa78bfa, 0x7c3aed);

    const label = this.add
      .text(cx, baseY, "ORBS", {
        fontFamily: '"8bit Wonder"',
        fontSize: "8px",
        color: "#9ca3af",
      })
      .setOrigin(0.5)
      .setAlpha(0);

    const value = this.add
      .text(cx, baseY + 26, "0", {
        fontFamily: '"8bit Wonder"',
        fontSize: "22px",
        color: "#a78bfa",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.tweens.add({
      targets: [label, value],
      alpha: 1,
      duration: 300,
    });

    const target = this.stats.orbsCollected;
    const dur = Math.min(1200, Math.max(400, target * 50));

    this.tweens.addCounter({
      from: 0,
      to: target,
      duration: dur,
      ease: "Power1",
      onUpdate: (tw) => value.setText(`${Math.floor(tw.getValue() ?? 0)}`),
      onComplete: () => {
        value.setText(`${target}`);
        this.time.delayedCall(500, () => this.showClickToContinue());
      },
    });
  }

  private showClickToContinue() {
    const cx = GAME_WIDTH / 2;

    this.clickLabel = this.add
      .text(cx, GAME_HEIGHT - 50, "CLICK TO CONTINUE", {
        fontFamily: '"8bit Wonder"',
        fontSize: "9px",
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

    // Single click → summary
    this.input.once("pointerdown", () => {
      this.phase = "summary";
      this.transitionToSummary();
    });
  }

  // ═══════════════════════════════════════════════════════
  //  PHASE 3 — Show React overlay
  // ═══════════════════════════════════════════════════════

  private transitionToSummary() {
    // Remove click handler
    this.input.off("pointerdown", this.handleClick, this);

    // Show the React Game Over overlay
    useGameStore.getState().showGameOver({
      stats: this.stats,
      floor: this.floor,
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

  /** Procedural closed chest (fallback when sprites missing) */
  private drawChestClosed(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ) {
    const w = 60;
    const h = 44;
    g.fillStyle(0x8b6914);
    g.fillRect(cx - w / 2, cy - h / 2, w, h);
    g.fillStyle(0xa67c1a);
    g.fillRect(cx - w / 2, cy - h / 2, w, h / 3);
    g.fillStyle(0xffd819);
    g.fillRect(cx - 5, cy - 5, 10, 10);
    g.lineStyle(2, 0x5a3e0a);
    g.strokeRect(cx - w / 2, cy - h / 2, w, h);
  }

  /** Procedural open chest (fallback) */
  private drawChestOpen(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
  ) {
    const w = 60;
    const h = 44;
    g.fillStyle(0x8b6914);
    g.fillRect(cx - w / 2, cy - h / 4, w, (h * 3) / 4);
    g.fillStyle(0xa67c1a);
    g.fillRect(cx - w / 2 - 2, cy - h / 2 - 10, w + 4, h / 3);
    g.fillStyle(0xffd819);
    g.fillRect(cx - w / 2 + 4, cy - h / 4 + 2, w - 8, 12);
    g.fillStyle(0xffd819, 0.3);
    g.fillCircle(cx, cy - 10, 35);
    g.lineStyle(2, 0x5a3e0a);
    g.strokeRect(cx - w / 2, cy - h / 4, w, (h * 3) / 4);
  }
}
