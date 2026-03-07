import Phaser from "phaser";
import { GAME_WIDTH, GAME_HEIGHT } from "../constants";

/**
 * VFXManager — MoG-style desaturation when energy is low.
 *
 * Uses camera postFX ColorMatrix to desaturate the screen when energy < 20.
 * Also exposes a heartbeat hook (sound not yet connected).
 */
export class VFXManager {
  private scene: Phaser.Scene;
  private colorMatrix: Phaser.FX.ColorMatrix | null = null;
  private desatAmount = 0;
  private damageOverlay: Phaser.GameObjects.Rectangle | null = null;
  private damageTween: Phaser.Tweens.Tween | null = null;
  private hitStopTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Heartbeat state (ready for when audio is added)
  private heartbeatActive = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Add ColorMatrix postFX to camera
    const cam = scene.cameras.main;
    if (cam.postFX) {
      this.colorMatrix = cam.postFX.addColorMatrix();
    }

    // Fullscreen dark-red hit overlay (very subtle / very fast)
    this.damageOverlay = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x8a1a24,
      1,
    );
    this.damageOverlay
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2400)
      .setAlpha(0);
  }

  /**
   * Update desaturation based on current energy.
   * Below threshold (20), screen progressively desaturates up to -0.7.
   */
  updateDesaturation(energy: number, _maxEnergy: number) {
    if (!this.colorMatrix) return;

    const threshold = 20;
    if (energy < threshold && energy > 0) {
      const t = 1 - energy / threshold; // 0 at 20 energy → 1 at 0 energy
      const target = -0.7 * t;

      if (Math.abs(target - this.desatAmount) > 0.01) {
        this.desatAmount = target;
        this.colorMatrix.reset();
        this.colorMatrix.saturate(this.desatAmount);
      }

      // Heartbeat hook
      if (!this.heartbeatActive) {
        this.heartbeatActive = true;
        // TODO: play sfx_heartbeat loop, volume = 0.2 + 0.8 * t
      }
    } else {
      if (this.desatAmount !== 0) {
        this.desatAmount = 0;
        this.colorMatrix.reset();
      }
      if (this.heartbeatActive) {
        this.heartbeatActive = false;
        // TODO: stop sfx_heartbeat loop
      }
    }
  }

  /** Very fast and subtle red screen flash when the player is hit */
  flashDamageOverlay() {
    if (!this.damageOverlay) return;

    this.damageTween?.stop();
    this.damageTween = null;

    this.damageOverlay.setAlpha(0);
    this.damageTween = this.scene.tweens.add({
      targets: this.damageOverlay,
      alpha: 0.14,
      duration: 26,
      ease: "Quad.Out",
      onComplete: () => {
        this.damageTween = this.scene.tweens.add({
          targets: this.damageOverlay,
          alpha: 0,
          duration: 84,
          ease: "Quad.In",
          onComplete: () => {
            this.damageTween = null;
          },
        });
      },
    });
  }

  /**
   * MoG-like impact on kill:
   * - quick camera shake
   * - very short hit-stop (global time freeze), then restore
   */
  playKillImpact(strong = false) {
    const cam = this.scene.cameras.main;
    cam.shake(strong ? 100 : 60, strong ? 0.006 : 0.003);

    if (this.hitStopTimeoutId !== null) {
      clearTimeout(this.hitStopTimeoutId);
      this.hitStopTimeoutId = null;
      this.restoreGlobalTimeScale();
    }

    this.scene.time.timeScale = 0;
    this.scene.tweens.timeScale = 0;
    this.scene.anims.globalTimeScale = 0;

    const restoreDelay = strong ? 80 : 50;
    this.hitStopTimeoutId = globalThis.setTimeout(() => {
      this.restoreGlobalTimeScale();
      this.hitStopTimeoutId = null;
    }, restoreDelay);
  }

  private restoreGlobalTimeScale() {
    this.scene.time.timeScale = 1;
    this.scene.tweens.timeScale = 1;
    this.scene.anims.globalTimeScale = 1;
  }

  /**
   * MoG-style death desaturation — heavy desaturation + slight tint shift.
   * Applied once at death, stays until scene transitions.
   */
  applyDeathDesaturation() {
    if (!this.colorMatrix) return;
    this.colorMatrix.reset();
    this.colorMatrix.saturate(-0.6);
    this.colorMatrix.brightness(0.95);
    this.colorMatrix.saturate(-0.5);
  }

  /**
   * MoG-style pixelated fade to black.
   * A grid of 16×16 black rectangles fades in from edges → center.
   */
  playPixelatedFadeToBlack(duration = 1500, onComplete?: () => void) {
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const cellSize = 16;
    const cols = Math.ceil(cam.width / cellSize) + 6;
    const rows = Math.ceil(cam.height / cellSize) + 6;

    const container = this.scene.add.container(cx, cy);
    container.setScrollFactor(0);
    container.setDepth(5000);

    const rects: Phaser.GameObjects.Rectangle[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rx = (c - cols / 2) * cellSize + cellSize / 2;
        const ry = (r - rows / 2) * cellSize + cellSize / 2;
        const rect = this.scene.add.rectangle(rx, ry, cellSize, cellSize, 0x000000);
        rect.setAlpha(0);
        container.add(rect);
        rects.push(rect);
      }
    }

    // Sort by distance from center — farthest first (edges fade in first)
    rects.sort((a, b) => {
      const da = Math.sqrt(a.x * a.x + a.y * a.y);
      const db = Math.sqrt(b.x * b.x + b.y * b.y);
      return db - da;
    });

    const spread = 0.7 * duration;
    rects.forEach((rect, i) => {
      const delay = Math.max(0, (i / rects.length) * spread + (Math.random() - 0.5) * 100);
      this.scene.tweens.add({
        targets: rect,
        alpha: 1,
        duration: 300,
        delay,
        ease: "Quad.easeIn",
      });
    });

    // Slight container scale-up like MoG
    this.scene.tweens.add({
      targets: container,
      scale: 1.4,
      duration: duration + 300,
      ease: "Quad.easeIn",
    });

    this.scene.time.delayedCall(duration + 300, () => {
      onComplete?.();
    });
  }

  destroy() {
    if (this.hitStopTimeoutId !== null) {
      clearTimeout(this.hitStopTimeoutId);
      this.hitStopTimeoutId = null;
      this.restoreGlobalTimeScale();
    }
    if (this.colorMatrix) {
      this.colorMatrix.reset();
      // postFX cleanup handled by camera destroy
      this.colorMatrix = null;
    }
    this.damageTween?.stop();
    this.damageTween = null;
    this.damageOverlay?.destroy();
    this.damageOverlay = null;
  }
}
