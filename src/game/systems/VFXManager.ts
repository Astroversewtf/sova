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

  destroy() {
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
