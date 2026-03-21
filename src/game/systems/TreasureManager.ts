import type { TilePos } from "../types";
import { TreasureType } from "../types";
import type { Treasure } from "../entities/Treasure";
import type { GameScene } from "../scenes/GameScene";
import { useGameStore } from "@/stores/gameStore";
import { emitSfxEvent } from "@/lib/audioEvents";

export class TreasureManager {
  private scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  checkPickup(playerPos: TilePos) {
    this.collectAt(playerPos);

    const radius = useGameStore.getState().getLootMagnetRadius();
    if (radius <= 0) return;

    for (const t of this.scene.treasures) {
      if (t.collected) continue;
      const dx = Math.abs(t.pos.x - playerPos.x);
      const dy = Math.abs(t.pos.y - playerPos.y);
      if (dx + dy <= radius) {
        this.collectTreasure(t);
      }
    }
  }

  private collectAt(pos: TilePos) {
    for (const t of this.scene.treasures) {
      if (!t.collected && t.pos.x === pos.x && t.pos.y === pos.y) {
        this.collectTreasure(t);
      }
    }
  }

  private collectTreasure(t: Treasure) {
    const store = useGameStore.getState();
    const tutorialMode = store.tutorialMode;

    if (t.type === "energy") {
      const startX = t.sprite.x;
      const startY = t.sprite.y;
      t.collected = true;
      t.destroy();
      this.scene.animateEnergyPickupToHud(startX, startY, () => {
        this.scene.energyManager.heal(t.value);
        emitSfxEvent("collect-energy");
      });
      this.scene.events.emit("treasure:collected", t);
      return;
    }

    t.collect();
    const { popupManager } = this.scene;

    if (t.type === "coin") {
      const value = Math.max(1, Math.floor(t.value * store.getLootMultiplier(TreasureType.COIN)));
      store.addTreasure("coin", value);
      if (!tutorialMode) {
        popupManager.showCoinPickup(t.pos.x, t.pos.y, value);
      }
      emitSfxEvent("collect-coin");
    } else if (t.type === "orb") {
      const value = Math.max(1, Math.floor(t.value * store.getLootMultiplier(TreasureType.ORB)));
      store.addTreasure("orb", value);
      if (!tutorialMode) {
        popupManager.showOrbPickup(t.pos.x, t.pos.y, value);
      }
      emitSfxEvent("collect-orb");
    } else {
      // golden_ticket
      if (!tutorialMode) {
        store.addTreasure("golden_ticket", t.value);
        popupManager.showTicketPickup(t.pos.x, t.pos.y, t.value);
      }
      emitSfxEvent("collect-golden-ticket");
    }

    if (!tutorialMode) {
      this.tryExtraDrop(t.pos);
    }
    this.scene.events.emit("treasure:collected", t);
  }

  private tryExtraDrop(pos: TilePos) {
    const store = useGameStore.getState();
    const chance = store.getExtraDropChance();
    if (chance <= 0 || Math.random() >= chance) return;

    if (Math.random() < 0.5) {
      const bonus = Math.max(1, Math.floor(8 * store.getLootMultiplier(TreasureType.COIN)));
      store.addTreasure("coin", bonus);
      this.scene.popupManager.showCoinPickup(pos.x, pos.y, bonus);
    } else {
      const bonus = Math.max(1, Math.floor(1 * store.getLootMultiplier(TreasureType.ORB)));
      store.addTreasure("orb", bonus);
      this.scene.popupManager.showOrbPickup(pos.x, pos.y, bonus);
    }
  }
}
