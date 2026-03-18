import type { UpgradeId } from "../types";
import type { GameScene } from "../scenes/GameScene";
import { useGameStore } from "@/stores/gameStore";

export class UpgradeManager {
  private scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  applyUpgrade(id: UpgradeId) {
    void this.scene; // Reserved for future scene-coupled upgrade effects.
    useGameStore.getState().addUpgrade(id);
  }
}
