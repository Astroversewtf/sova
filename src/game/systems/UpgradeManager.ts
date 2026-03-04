import type { UpgradeId, UpgradeDef } from "../types";
import { UPGRADES } from "../constants";
import type { GameScene } from "../scenes/GameScene";
import { useGameStore } from "@/stores/gameStore";

export class UpgradeManager {
  private scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  /** Roll 3 random upgrades (no duplicates, respect stackable rules) */
  rollChoices(): UpgradeDef[] {
    const store = useGameStore.getState();
    const available = UPGRADES.filter((u) => {
      if (!u.stackable && (store.upgrades[u.id] ?? 0) > 0) return false;
      return true;
    });

    // Shuffle and pick 3
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  /** Apply a chosen upgrade */
  applyUpgrade(id: UpgradeId) {
    const store = useGameStore.getState();
    store.addUpgrade(id);

    switch (id) {
      case "sharp_blade":
        store.setAtk(store.atk + 1);
        break;
      case "vitality_surge":
        this.scene.energyManager.addMaxEnergy(10);
        break;
      case "second_wind":
        this.scene.energyManager.heal(15);
        break;
      case "eagle_eye":
      case "life_steal":
      case "thick_skin":
      case "treasure_magnet":
      case "swift_feet":
        // These are passive — checked at usage time
        break;
    }
  }
}
