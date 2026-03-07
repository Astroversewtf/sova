import type { TilePos } from "../types";
import type { Treasure } from "../entities/Treasure";
import type { GameScene } from "../scenes/GameScene";
import { useGameStore } from "@/stores/gameStore";

export class TreasureManager {
  private scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  checkPickup(playerPos: TilePos) {
    this.collectAt(playerPos);
  }

  private collectAt(pos: TilePos) {
    for (const t of this.scene.treasures) {
      if (!t.collected && t.pos.x === pos.x && t.pos.y === pos.y) {
        this.collectTreasure(t);
      }
    }
  }

  private collectTreasure(t: Treasure) {
    t.collect();

    const { popupManager } = this.scene;

    if (t.type === "energy") {
      this.scene.energyManager.heal(t.value);
      popupManager.showEnergyBonus(t.pos.x, t.pos.y, t.value);
    } else if (t.type === "coin") {
      useGameStore.getState().addTreasure("coin", t.value);
      popupManager.showCoinPickup(t.pos.x, t.pos.y, t.value);
    } else if (t.type === "orb") {
      useGameStore.getState().addTreasure("orb", t.value);
      popupManager.showOrbPickup(t.pos.x, t.pos.y, t.value);
    } else {
      // golden_ticket
      useGameStore.getState().addTreasure("golden_ticket", t.value);
      popupManager.showTicketPickup(t.pos.x, t.pos.y, t.value);
    }

    this.scene.events.emit("treasure:collected", t);
  }
}
