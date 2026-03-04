import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";
import { useGameStore } from "@/stores/gameStore";

/**
 * Overlay HUD:
 * - Top-left: ENERGY — lightning icon + lime fill bar + "XX/100"
 * - Top-right: Resource badges — loot counts + floor number
 */
export class HUDScene extends Phaser.Scene {
  // Energy bar
  private energyContainer!: Phaser.GameObjects.Graphics;
  private energyFill!: Phaser.GameObjects.Graphics;
  private energyIconSprite!: Phaser.GameObjects.Image;
  private energyText!: Phaser.GameObjects.Text;
  private energyLabel!: Phaser.GameObjects.Text;

  // Resource badges
  private badgeBg!: Phaser.GameObjects.Graphics;
  private coinDot!: Phaser.GameObjects.Graphics;
  private coinText!: Phaser.GameObjects.Text;
  private gemDot!: Phaser.GameObjects.Graphics;
  private gemText!: Phaser.GameObjects.Text;
  private ticketDot!: Phaser.GameObjects.Graphics;
  private ticketText!: Phaser.GameObjects.Text;
  private floorDot!: Phaser.GameObjects.Graphics;
  private floorText!: Phaser.GameObjects.Text;

  // Floor label
  private floorLabel: Phaser.GameObjects.Text | null = null;

  // Layout constants
  private readonly PILL_X = 8;
  private readonly PILL_Y = 20;
  private readonly PILL_W = 260;
  private readonly PILL_H = 36;

  constructor() {
    super({ key: "HUDScene" });
  }

  create() {
    // ══════════════════════════════════════════
    // TOP-LEFT: ENERGY BAR
    // ══════════════════════════════════════════

    // "ENERGY" label above bar
    this.energyLabel = this.add.text(this.PILL_X + 2, this.PILL_Y - 3, "ENERGY", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "8px",
      color: "#e5e7eb",
    }).setOrigin(0, 1);

    // Dark rounded container
    this.energyContainer = this.add.graphics();
    this.energyContainer.fillStyle(0x0f172a, 0.92);
    this.energyContainer.fillRoundedRect(this.PILL_X, this.PILL_Y, this.PILL_W, this.PILL_H, 10);
    this.energyContainer.lineStyle(1, 0x334155, 0.5);
    this.energyContainer.strokeRoundedRect(this.PILL_X, this.PILL_Y, this.PILL_W, this.PILL_H, 10);

    // Lightning bolt icon (from PNG)
    const iconX = this.PILL_X + 18;
    const iconY = this.PILL_Y + this.PILL_H / 2;
    if (this.textures.exists("energy-icon")) {
      this.energyIconSprite = this.add.image(iconX, iconY, "energy-icon");
      this.energyIconSprite.setDisplaySize(20, 20);
    }

    // Fill bar (redrawn each frame)
    this.energyFill = this.add.graphics();

    // "XX/100" text inside bar
    this.energyText = this.add.text(
      this.PILL_X + this.PILL_W / 2 + 12, this.PILL_Y + this.PILL_H / 2, "",
      {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "11px",
        color: "#1a1a2e",
        stroke: "#ffffff",
        strokeThickness: 1,
      },
    ).setOrigin(0.5);

    // ══════════════════════════════════════════
    // TOP-RIGHT: RESOURCE BADGES + FLOOR
    // ══════════════════════════════════════════
    const badgeW = 230;
    const badgeH = 30;
    const badgeX = GAME_WIDTH - badgeW - 8;
    const badgeY = 22;

    this.badgeBg = this.add.graphics();
    this.badgeBg.fillStyle(0x0f172a, 0.92);
    this.badgeBg.fillRoundedRect(badgeX, badgeY, badgeW, badgeH, 10);
    this.badgeBg.lineStyle(1, 0x334155, 0.5);
    this.badgeBg.strokeRoundedRect(badgeX, badgeY, badgeW, badgeH, 10);

    const midY = badgeY + badgeH / 2;
    const dotR = 6;
    const fontSize = "9px";
    const fontCfg = { fontFamily: '"Press Start 2P", monospace', fontSize };

    // Coin (orange)
    const cx1 = badgeX + 18;
    this.coinDot = this.add.graphics();
    this.coinDot.fillStyle(0xf59e0b);
    this.coinDot.fillCircle(cx1, midY, dotR);
    this.coinDot.lineStyle(1.5, 0xb45309);
    this.coinDot.strokeCircle(cx1, midY, dotR);
    this.coinText = this.add.text(cx1 + 12, midY, "0", {
      ...fontCfg, color: "#fbbf24",
    }).setOrigin(0, 0.5);

    // Gem (teal)
    const cx2 = badgeX + 68;
    this.gemDot = this.add.graphics();
    this.gemDot.fillStyle(0x2dd4bf);
    this.gemDot.fillCircle(cx2, midY, dotR);
    this.gemDot.lineStyle(1.5, 0x0d9488);
    this.gemDot.strokeCircle(cx2, midY, dotR);
    this.gemText = this.add.text(cx2 + 12, midY, "0", {
      ...fontCfg, color: "#5eead4",
    }).setOrigin(0, 0.5);

    // Golden Ticket (gold/yellow)
    const cx3 = badgeX + 118;
    this.ticketDot = this.add.graphics();
    this.ticketDot.fillStyle(0xfbbf24);
    this.ticketDot.fillCircle(cx3, midY, dotR);
    this.ticketDot.lineStyle(1.5, 0xd97706);
    this.ticketDot.strokeCircle(cx3, midY, dotR);
    this.ticketText = this.add.text(cx3 + 12, midY, "0", {
      ...fontCfg, color: "#fde68a",
    }).setOrigin(0, 0.5);

    // Separator
    const sepX = badgeX + 164;
    const sepG = this.add.graphics();
    sepG.fillStyle(0x334155, 0.6);
    sepG.fillRect(sepX, badgeY + 6, 1, badgeH - 12);

    // Floor number
    const cx4 = badgeX + 178;
    this.floorDot = this.add.graphics();
    this.floorDot.fillStyle(0x94a3b8);
    this.floorDot.fillCircle(cx4, midY, dotR);
    this.floorDot.lineStyle(1.5, 0x64748b);
    this.floorDot.strokeCircle(cx4, midY, dotR);
    this.floorText = this.add.text(cx4 + 12, midY, "F1", {
      ...fontCfg, color: "#e2e8f0",
    }).setOrigin(0, 0.5);

    // ══════════════════════════════════════════
    // EVENTS
    // ══════════════════════════════════════════
    this.game.events.on("sova:floor-start", (data: { floor: number; isBoss: boolean }) => {
      this.showFloorLabel(data.floor, data.isBoss);
    });

    this.events.on("shutdown", () => {
      this.game.events.off("sova:floor-start");
    });
  }

  update() {
    const s = useGameStore.getState();
    this.drawEnergyFill(s.energy, s.maxEnergy);
    this.energyText.setText(`${s.energy}/${s.maxEnergy}`);
    this.coinText.setText(`${s.coinsCollected}`);
    this.gemText.setText(`${s.gemsCollected}`);
    this.ticketText.setText(`${s.goldenTicketsCollected}`);
    this.floorText.setText(`F${s.floor}`);
  }

  private drawEnergyFill(energy: number, maxEnergy: number) {
    const pct = maxEnergy > 0 ? energy / maxEnergy : 0;

    // Bar area (right of icon)
    const barX = this.PILL_X + 34;
    const barY = this.PILL_Y + 5;
    const barW = this.PILL_W - 42;
    const barH = this.PILL_H - 10;

    this.energyFill.clear();

    // Dark track behind the fill
    this.energyFill.fillStyle(0x1e293b, 0.8);
    this.energyFill.fillRoundedRect(barX, barY, barW, barH, 7);

    const fillW = Math.max(0, barW * pct);
    if (fillW <= 0) return;

    // Lime-green fill
    this.energyFill.fillStyle(0xb8e550, 0.95);
    this.energyFill.fillRoundedRect(barX, barY, fillW, barH, 7);

    // Highlight on top half for glossy effect
    this.energyFill.fillStyle(0xffffff, 0.12);
    this.energyFill.fillRoundedRect(barX + 2, barY + 1, Math.max(0, fillW - 4), barH / 2, 4);
  }

  private showFloorLabel(floor: number, isBoss: boolean) {
    this.floorLabel?.destroy();

    const label = isBoss ? `BOSS FLOOR ${floor}` : `FLOOR ${floor}`;
    const color = isBoss ? "#8b5cf6" : "#f9fafb";

    this.floorLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, label, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: "16px",
        color,
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2000)
      .setAlpha(0);

    this.tweens.add({
      targets: this.floorLabel,
      alpha: { from: 0, to: 1 },
      duration: 300,
      yoyo: true,
      hold: 800,
      onComplete: () => {
        this.floorLabel?.destroy();
        this.floorLabel = null;
      },
    });
  }
}
