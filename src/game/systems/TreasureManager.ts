import type { TilePos } from "../types";
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
  }

  private collectAt(pos: TilePos) {
    for (const t of this.scene.treasures) {
      if (!t.collected && t.pos.x === pos.x && t.pos.y === pos.y) {
        this.collectTreasure(t);
      }
    }
  }

  private collectTreasure(t: Treasure) {
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
      useGameStore.getState().addTreasure("coin", t.value);
      popupManager.showCoinPickup(t.pos.x, t.pos.y, t.value);
      emitSfxEvent("collect-coin");
    } else if (t.type === "orb") {
      useGameStore.getState().addTreasure("orb", t.value);
      popupManager.showOrbPickup(t.pos.x, t.pos.y, t.value);
      emitSfxEvent("collect-orb");
    } else {
      // golden_ticket
      useGameStore.getState().addTreasure("golden_ticket", t.value);
      popupManager.showTicketPickup(t.pos.x, t.pos.y, t.value);
      emitSfxEvent("collect-golden-ticket");
    }

    this.scene.events.emit("treasure:collected", t);
  }
}
