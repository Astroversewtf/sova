import type { UpgradeId, UpgradeDef } from "../types";
import { UPGRADES } from "../constants";
import type { GameScene } from "../scenes/GameScene";
import { useGameStore } from "@/stores/gameStore";

export class UpgradeManager {
  private scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  /** Roll 3 upgrades using rarity rates: 60% common, 30% rare, 10% epic */
  rollChoices(): UpgradeDef[] {
    const store = useGameStore.getState();
    const available = UPGRADES.filter((u) => {
      if (!u.stackable && (store.upgrades[u.id] ?? 0) > 0) return false;
      return true;
    });

    const byRarity = {
      common: available.filter((u) => u.rarity === "common"),
      rare: available.filter((u) => u.rarity === "rare"),
      epic: available.filter((u) => u.rarity === "epic"),
    };

    const picked: UpgradeDef[] = [];
    const usedIds = new Set<UpgradeId>();

    for (let i = 0; i < 3; i++) {
      const roll = Math.random();
      let targetRarity: "common" | "rare" | "epic";
      if (roll < 0.6) targetRarity = "common";
      else if (roll < 0.9) targetRarity = "rare";
      else targetRarity = "epic";

      const upgrade = pickFromRarity(targetRarity, byRarity, usedIds);
      if (upgrade) {
        picked.push(upgrade);
        usedIds.add(upgrade.id);
      }
    }

    return picked;
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
      case "life_steal":
      case "thick_skin":
      case "swift_feet":
        // Passive — checked at usage time
        break;
    }
  }
}

/** Pick a random upgrade from a rarity pool, falling back to lower rarities */
function pickFromRarity(
  target: "common" | "rare" | "epic",
  pools: Record<string, UpgradeDef[]>,
  used: Set<UpgradeId>,
): UpgradeDef | null {
  const fallbackOrder: ("common" | "rare" | "epic")[] =
    target === "epic"
      ? ["epic", "rare", "common"]
      : target === "rare"
        ? ["rare", "common"]
        : ["common", "rare"];

  for (const rarity of fallbackOrder) {
    const candidates = pools[rarity].filter((u) => !used.has(u.id));
    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
  }
  return null;
}
