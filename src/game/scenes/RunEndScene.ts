import Phaser from "phaser";
import type { RunStats } from "../types";
import { useGameStore } from "@/stores/gameStore";

interface RunEndData {
  stats: RunStats;
  floor: number;
}

/**
 * End-run handoff scene:
 * Phaser gameplay has already faded to black in GameScene.
 * This scene now immediately hands control to the React run-end overlays.
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

    // Hide gameplay HUD and hand off to React overlays.
    useGameStore.setState({ isRunning: false });

    this.time.delayedCall(40, () => {
      useGameStore.getState().startLootReveal({
        stats: this.stats,
        floor: this.floor,
      });
      this.scene.stop();
    });
  }
}
