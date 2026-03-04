import Phaser from "phaser";

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

  // Heartbeat state (ready for when audio is added)
  private heartbeatActive = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Add ColorMatrix postFX to camera
    const cam = scene.cameras.main;
    if (cam.postFX) {
      this.colorMatrix = cam.postFX.addColorMatrix();
    }
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

  destroy() {
    if (this.colorMatrix) {
      this.colorMatrix.reset();
      // postFX cleanup handled by camera destroy
      this.colorMatrix = null;
    }
  }
}
