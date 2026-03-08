import Phaser from "phaser";
import { TILE_SIZE, TILE_FULL_H } from "../constants";

/**
 * MoG-style popup text with dual-outline for maximum legibility:
 *   Layer 1: white stroke (thick)  — outer glow
 *   Layer 2: black stroke (thin)   — inner outline, tinted with effect color
 *
 * Both layers sit in a container at depth 2000.
 */
export class PopupManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ═══════════════════════════════════════════════════════
  //  Public API
  // ═══════════════════════════════════════════════════════

  /** Damage dealt TO an enemy (player attacks) */
  showDamageNumber(tileX: number, tileY: number, damage: number) {
    const worldX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const worldY = tileY * TILE_FULL_H - 12;

    const popup = this.createPopupText(worldX, worldY, `-${damage}`, "#ff6b6b");

    this.scene.tweens.add({
      targets: popup,
      y: worldY - 24,
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 1.1 },
      duration: 800,
      ease: "Quad.easeOut",
      onComplete: () => this.destroyPopup(popup),
    });
  }

  /** Damage received BY the player (enemy attacks) */
  showPlayerDamageNumber(tileX: number, tileY: number, damage: number) {
    const worldX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const worldY = tileY * TILE_FULL_H;

    const popup = this.createPopupText(worldX, worldY, `-${damage}`, "#ff6b6b");

    this.scene.tweens.add({
      targets: popup,
      y: worldY - 28,
      alpha: { from: 1, to: 0 },
      scale: { from: 1.1, to: 1.2 },
      duration: 900,
      ease: "Quad.easeOut",
      onComplete: () => this.destroyPopup(popup),
    });
  }

  /** Short boss taunt popup (white). */
  showBossTaunt(tileX: number, tileY: number, text: string) {
    const worldX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const worldY = tileY * TILE_FULL_H - 12;

    const popup = this.createPopupText(worldX, worldY, text, "#ffffff", "12px");

    this.scene.tweens.add({
      targets: popup,
      y: worldY - 18,
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 1.05 },
      duration: 650,
      ease: "Quad.easeOut",
      onComplete: () => this.destroyPopup(popup),
    });
  }

  /** Energy pickup (+5 yellow) */
  showEnergyBonus(tileX: number, tileY: number, value: number) {
    const worldX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const worldY = tileY * TILE_FULL_H - 6;

    const popup = this.createPopupText(worldX, worldY, `+${value}`, "#f59e0b");

    this.scene.tweens.add({
      targets: popup,
      y: worldY - 32,
      alpha: { from: 1, to: 0 },
      scale: { from: 1.1, to: 1.2 },
      duration: 1000,
      ease: "Quad.easeOut",
      onComplete: () => this.destroyPopup(popup),
    });

    this.playPickupParticles(tileX, tileY, 0xf59e0b);
  }

  /** Coin pickup (+1 gold) */
  showCoinPickup(tileX: number, tileY: number, value: number) {
    const worldX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const worldY = tileY * TILE_FULL_H - 6;

    const popup = this.createPopupText(worldX, worldY, `+${value}`, "#d97706");

    this.scene.tweens.add({
      targets: popup,
      y: worldY - 24,
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 1.1 },
      duration: 800,
      ease: "Quad.easeOut",
      onComplete: () => this.destroyPopup(popup),
    });

    this.playPickupParticles(tileX, tileY, 0xd97706);
  }

  /** Orb pickup (+1 dark blue) */
  showOrbPickup(tileX: number, tileY: number, value: number) {
    const worldX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const worldY = tileY * TILE_FULL_H - 6;

    const popup = this.createPopupText(worldX, worldY, `+${value}`, "#1e3a5a");

    this.scene.tweens.add({
      targets: popup,
      y: worldY - 24,
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 1.1 },
      duration: 800,
      ease: "Quad.easeOut",
      onComplete: () => this.destroyPopup(popup),
    });

    this.playPickupParticles(tileX, tileY, 0x1e3a5a);
  }

  /** Golden Ticket pickup */
  showTicketPickup(tileX: number, tileY: number, value: number) {
    const worldX = tileX * TILE_SIZE + TILE_SIZE / 2;
    const worldY = tileY * TILE_FULL_H - 6;

    const popup = this.createPopupText(worldX, worldY, `+${value}`, "#34d399");

    this.scene.tweens.add({
      targets: popup,
      y: worldY - 24,
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 1.1 },
      duration: 800,
      ease: "Quad.easeOut",
      onComplete: () => this.destroyPopup(popup),
    });

    this.playPickupParticles(tileX, tileY, 0x34d399);
  }

  // ═══════════════════════════════════════════════════════
  //  Dual-outline text (MoG style)
  // ═══════════════════════════════════════════════════════

  private createPopupText(
    x: number,
    y: number,
    text: string,
    hexColor: string,
    fontSize = "16px",
  ): Phaser.GameObjects.Container {
    const label = text.toUpperCase();
    const isLarge = fontSize === "24px";

    const fontStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize,
      fontFamily: '"8bit Wonder", monospace',
    };

    // Layer 1: white outer stroke
    const whiteLayer = this.scene.add.text(0, 0, label, {
      ...fontStyle,
      color: "#000000",
      stroke: "#ffffff",
      strokeThickness: isLarge ? 10 : 8,
    });
    whiteLayer.setOrigin(0.5, 0.5);

    // Layer 2: black inner stroke, tinted with effect color
    const colorLayer = this.scene.add.text(0, 0, label, {
      ...fontStyle,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: isLarge ? 5 : 4,
    });
    colorLayer.setOrigin(0.5, 0.5);

    // Tint the color layer: lighter on top, darker on bottom
    const colorInt = parseInt(hexColor.replace("#", ""), 16);
    const lighter = this.lightenColor(colorInt, 0.4);
    colorLayer.setTint(lighter, lighter, colorInt, colorInt);

    const container = this.scene.add.container(x, y, [whiteLayer, colorLayer]);
    container.setDepth(2000);

    return container;
  }

  private lightenColor(color: number, amount: number): number {
    const r = Math.min(255, ((color >> 16) & 255) + 255 * amount);
    const g = Math.min(255, ((color >> 8) & 255) + 255 * amount);
    const b = Math.min(255, (color & 255) + 255 * amount);
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  private destroyPopup(container: Phaser.GameObjects.Container) {
    this.scene.tweens.killTweensOf(container);
    for (const child of container.list) {
      this.scene.tweens.killTweensOf(child);
    }
    container.destroy();
  }

  // ═══════════════════════════════════════════════════════
  //  Pickup particles (5 colored circles)
  // ═══════════════════════════════════════════════════════

  private playPickupParticles(tileX: number, tileY: number, color: number) {
    const cx = tileX * TILE_SIZE + TILE_SIZE / 2;
    const cy = tileY * TILE_FULL_H - 6;

    for (let i = 0; i < 5; i++) {
      const g = this.scene.add.graphics();
      const radius = 2 + 3 * Math.random();
      g.fillStyle(color, 1);
      g.fillCircle(0, 0, radius);

      const offsetX = (Math.random() - 0.5) * 25.6;
      const offsetY = (Math.random() - 0.5) * 16;
      g.setPosition(cx + offsetX, cy + offsetY);
      g.setDepth(2000);

      const dx = (Math.random() - 0.5) * 10;
      const dy = 20 + 15 * Math.random();
      const delay = 30 * i;

      this.scene.tweens.add({
        targets: g,
        x: g.x + dx,
        y: g.y - dy,
        alpha: { from: 1, to: 0 },
        scale: { from: 1, to: 0.3 },
        duration: 400 + 200 * Math.random(),
        delay,
        ease: "Quad.easeOut",
        onComplete: () => g.destroy(),
      });
    }
  }
}
