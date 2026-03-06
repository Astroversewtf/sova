import Phaser from "phaser";

/**
 * Upgrade scene stub — the upgrade UI is now rendered as a React overlay
 * (UpgradeOverlay.tsx) for proper z-indexing and backdrop blur.
 * This scene is kept registered for backwards compatibility.
 */
export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super({ key: "UpgradeScene" });
  }
}
