import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";
import type { RunStats } from "../types";
import { useGameStore } from "@/stores/gameStore";

interface RunEndData {
  stats: RunStats;
  floor: number;
}

/**
 * MoG-style run end with phased chest animation:
 * 1. "GAME OVER" fade in + hold
 * 2. Chest drops from above (bounce)
 * 3. Chest shakes
 * 4. Chest opens — background shifts to gold
 * 5. Treasure count-up with gold particles
 * 6. Gems count-up with pink particles
 * 7. Summary stats + buttons
 */
export class RunEndScene extends Phaser.Scene {
  private stats!: RunStats;
  private floor!: number;

  constructor() {
    super({ key: "RunEndScene" });
  }

  create(data: RunEndData) {
    this.stats = data.stats;
    this.floor = data.floor;

    this.cameras.main.setBackgroundColor(0x000000);

    // Phase 1: "GAME OVER"
    this.phaseGameOver();
  }

  // ── Phase 1: GAME OVER text ──
  private phaseGameOver() {
    const centerY = GAME_HEIGHT / 2;
    const fontSize = 32;
    const padX = 14;
    const padY = 10;
    const gap = 8;

    const gameText = this.add
      .text(0, 0, "GAME", {
        fontFamily: '"8bit Wonder"', fontSize: `${fontSize}px`, color: "#ffffff",
      }).setOrigin(0.5).setAlpha(0);

    const overText = this.add
      .text(0, 0, "OVER", {
        fontFamily: '"8bit Wonder"', fontSize: `${fontSize}px`, color: "#ffffff",
      }).setOrigin(0.5).setAlpha(0);

    const w1 = gameText.width + padX * 2;
    const w2 = overText.width + padX * 2;
    const boxH = fontSize + padY * 2;
    const totalW = w1 + gap + w2;
    const startX = GAME_WIDTH / 2 - totalW / 2;

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
              this.phaseChestDrop();
            },
          });
        });
      },
    });
  }

  // ── Phase 2: Chest drops from above ──
  private phaseChestDrop() {
    const cx = GAME_WIDTH / 2;
    const targetY = GAME_HEIGHT / 2 - 20;

    // Chest graphic (pixelated box)
    const chest = this.add.graphics();
    this.drawChestClosed(chest, cx, -60);

    this.tweens.add({
      targets: chest,
      y: targetY + 60,
      duration: 600,
      ease: "Bounce.easeOut",
      onComplete: () => {
        this.phaseChestShake(chest, cx, targetY);
      },
    });
  }

  // ── Phase 3: Chest shakes ──
  private phaseChestShake(chest: Phaser.GameObjects.Graphics, cx: number, cy: number) {
    this.tweens.add({
      targets: chest,
      x: { from: cx - 4, to: cx + 4 },
      duration: 50,
      yoyo: true,
      repeat: 8,
      ease: "Sine.easeInOut",
      onComplete: () => {
        chest.x = cx;
        this.phaseChestOpen(chest, cx, cy);
      },
    });
  }

  // ── Phase 4: Chest opens ──
  private phaseChestOpen(chest: Phaser.GameObjects.Graphics, cx: number, cy: number) {
    // Flash of light
    const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffd819, 0);
    this.tweens.add({
      targets: flash,
      fillAlpha: { from: 0.6, to: 0 },
      duration: 400,
      ease: "Power2",
    });

    // Redraw chest as open
    chest.clear();
    this.drawChestOpen(chest, cx, cy);

    // Slight scale pulse
    this.tweens.add({
      targets: chest,
      scaleX: { from: 1.2, to: 1 },
      scaleY: { from: 1.2, to: 1 },
      duration: 300,
      ease: "Back.easeOut",
      onComplete: () => {
        this.time.delayedCall(400, () => {
          this.phaseTreasureReveal(chest);
        });
      },
    });
  }

  // ── Phase 5: Coins count-up ──
  private phaseTreasureReveal(chest: Phaser.GameObjects.Graphics) {
    const { stats } = this;

    // Gold particles
    this.spawnParticles(0xffd819, 0xffa500, 20);

    // Floor label
    this.add.text(GAME_WIDTH / 2, 40, `FLOOR ${this.floor}`, {
      fontFamily: '"8bit Wonder"', fontSize: "10px", color: "#94a3b8",
      stroke: "#000000", strokeThickness: 2,
    }).setOrigin(0.5);

    // Coins counter
    const coinsLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, "COINS", {
      fontFamily: '"8bit Wonder"', fontSize: "8px", color: "#9ca3af",
    }).setOrigin(0.5);

    const coinsValue = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 100, "0", {
      fontFamily: '"8bit Wonder"', fontSize: "18px", color: "#fbbf24",
      stroke: "#000000", strokeThickness: 3,
    }).setOrigin(0.5);

    // Count-up animation
    const target = stats.coinsCollected;
    const duration = Math.min(1500, Math.max(500, target * 30));
    this.tweens.addCounter({
      from: 0,
      to: target,
      duration,
      ease: "Power1",
      onUpdate: (tween) => {
        coinsValue.setText(`${Math.floor(tween.getValue() ?? 0)}`);
      },
      onComplete: () => {
        coinsValue.setText(`${target}`);
        this.time.delayedCall(400, () => {
          this.phaseGemsReveal(chest, coinsLabel, coinsValue);
        });
      },
    });
  }

  // ── Phase 6: Gems count-up ──
  private phaseGemsReveal(
    chest: Phaser.GameObjects.Graphics,
    coinsLabel: Phaser.GameObjects.Text,
    coinsValue: Phaser.GameObjects.Text,
  ) {
    const { stats } = this;

    // Pink particles
    this.spawnParticles(0xf52ea0, 0xff69b4, 15);

    // Shift coins up
    this.tweens.add({ targets: coinsLabel, y: GAME_HEIGHT / 2 + 60, duration: 300 });
    this.tweens.add({ targets: coinsValue, y: GAME_HEIGHT / 2 + 80, duration: 300 });

    const gemsLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 105, "GEMS", {
      fontFamily: '"8bit Wonder"', fontSize: "8px", color: "#9ca3af",
    }).setOrigin(0.5).setAlpha(0);

    const gemsValue = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 125, "0", {
      fontFamily: '"8bit Wonder"', fontSize: "18px", color: "#a78bfa",
      stroke: "#000000", strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: [gemsLabel, gemsValue],
      alpha: 1,
      duration: 300,
    });

    const target = stats.gemsCollected;
    const duration = Math.min(1200, Math.max(400, target * 50));
    this.tweens.addCounter({
      from: 0,
      to: target,
      duration,
      ease: "Power1",
      onUpdate: (tween) => {
        gemsValue.setText(`${Math.floor(tween.getValue() ?? 0)}`);
      },
      onComplete: () => {
        gemsValue.setText(`${target}`);
        this.time.delayedCall(600, () => {
          this.phaseSummary(chest);
        });
      },
    });
  }

  // ── Phase 7: Summary + buttons ──
  private phaseSummary(chest: Phaser.GameObjects.Graphics) {
    const { stats, floor } = this;

    // Fade chest down
    this.tweens.add({
      targets: chest,
      alpha: 0.3,
      y: chest.y + 30,
      duration: 500,
    });

    // Stats panel
    const panelX = GAME_WIDTH / 2;
    const panelW = 300;
    const panelY = GAME_HEIGHT / 2 + 160;

    const panelG = this.add.graphics().setAlpha(0);
    panelG.fillStyle(0x111827, 0.9);
    panelG.fillRoundedRect(panelX - panelW / 2, panelY, panelW, 100, 6);
    panelG.lineStyle(1, 0x374151, 0.6);
    panelG.strokeRoundedRect(panelX - panelW / 2, panelY, panelW, 100, 6);

    const lines = [
      { label: "TOTAL TREASURE", value: `${stats.totalTreasure} PTS`, color: "#fbbf24" },
      { label: "ENEMIES KILLED", value: `${stats.enemiesKilled}`, color: "#ef4444" },
      { label: "FLOORS CLEARED", value: `${stats.floorsCleared}`, color: "#3b82f6" },
    ];

    const lineTexts: Phaser.GameObjects.Text[] = [];
    lines.forEach((line, i) => {
      const ly = panelY + 18 + i * 26;
      lineTexts.push(
        this.add.text(panelX - panelW / 2 + 20, ly, line.label, {
          fontFamily: '"8bit Wonder"', fontSize: "7px", color: "#9ca3af",
        }).setAlpha(0),
      );
      lineTexts.push(
        this.add.text(panelX + panelW / 2 - 20, ly, line.value, {
          fontFamily: '"8bit Wonder"', fontSize: "7px", color: line.color,
        }).setOrigin(1, 0).setAlpha(0),
      );
    });

    // Buttons
    const btnY = GAME_HEIGHT - 40;

    const playBg = this.add
      .rectangle(GAME_WIDTH / 2 - 90, btnY, 130, 32, 0x16a34a, 0.9)
      .setStrokeStyle(1, 0x22c55e)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    const playText = this.add
      .text(GAME_WIDTH / 2 - 90, btnY, "PLAY AGAIN", {
        fontFamily: '"8bit Wonder"', fontSize: "8px", color: "#ffffff",
      }).setOrigin(0.5).setAlpha(0);

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
        fontFamily: '"8bit Wonder"', fontSize: "8px", color: "#d1d5db",
      }).setOrigin(0.5).setAlpha(0);

    lobbyBg.on("pointerover", () => lobbyBg.setFillStyle(0x4b5563, 1));
    lobbyBg.on("pointerout", () => lobbyBg.setFillStyle(0x374151, 0.9));
    lobbyBg.on("pointerdown", () => {
      useGameStore.getState().endRun();
      this.scene.stop();
      this.game.events.emit("go-to-lobby");
    });

    // Fade in summary
    this.tweens.add({
      targets: [panelG, ...lineTexts, playBg, playText, lobbyBg, lobbyText],
      alpha: 1,
      duration: 600,
      ease: "Power1",
    });
  }

  // ── Helpers ──

  private drawChestClosed(g: Phaser.GameObjects.Graphics, cx: number, cy: number) {
    const w = 48, h = 36;
    // Body
    g.fillStyle(0x8b6914);
    g.fillRect(cx - w / 2, cy - h / 2, w, h);
    // Lid
    g.fillStyle(0xa67c1a);
    g.fillRect(cx - w / 2, cy - h / 2, w, h / 3);
    // Lock
    g.fillStyle(0xffd819);
    g.fillRect(cx - 4, cy - 4, 8, 8);
    // Border
    g.lineStyle(2, 0x5a3e0a);
    g.strokeRect(cx - w / 2, cy - h / 2, w, h);
  }

  private drawChestOpen(g: Phaser.GameObjects.Graphics, cx: number, cy: number) {
    const w = 48, h = 36;
    // Body
    g.fillStyle(0x8b6914);
    g.fillRect(cx - w / 2, cy - h / 4, w, h * 3 / 4);
    // Open lid (tilted back)
    g.fillStyle(0xa67c1a);
    g.fillRect(cx - w / 2 - 2, cy - h / 2 - 8, w + 4, h / 3);
    // Gold inside
    g.fillStyle(0xffd819);
    g.fillRect(cx - w / 2 + 4, cy - h / 4 + 2, w - 8, 10);
    // Glow
    g.fillStyle(0xffd819, 0.3);
    g.fillCircle(cx, cy - 10, 30);
    // Border
    g.lineStyle(2, 0x5a3e0a);
    g.strokeRect(cx - w / 2, cy - h / 4, w, h * 3 / 4);
  }

  private spawnParticles(color1: number, color2: number, count: number) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 20;

    for (let i = 0; i < count; i++) {
      const color = Math.random() > 0.5 ? color1 : color2;
      const size = 2 + Math.random() * 3;
      const particle = this.add.graphics();
      particle.fillStyle(color, 0.9);
      particle.fillRect(-size / 2, -size / 2, size, size);
      particle.setPosition(cx, cy);

      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 120;
      const tx = cx + Math.cos(angle) * speed;
      const ty = cy + Math.sin(angle) * speed - 40;

      this.tweens.add({
        targets: particle,
        x: tx,
        y: ty,
        alpha: 0,
        duration: 600 + Math.random() * 400,
        delay: Math.random() * 200,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }
  }
}
