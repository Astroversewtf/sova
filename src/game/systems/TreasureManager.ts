import type { TilePos } from "../types";
import type { Treasure } from "../entities/Treasure";
import type { GameScene } from "../scenes/GameScene";
import { useGameStore } from "@/stores/gameStore";

function manhattan(a: TilePos, b: TilePos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export class TreasureManager {
  private scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  checkPickup(playerPos: TilePos) {
    // Direct pickup
    this.collectAt(playerPos);

    // Treasure Magnet — auto-collect within radius
    const magnetStacks = useGameStore.getState().getUpgradeStacks("treasure_magnet");
    if (magnetStacks > 0) {
      const magnetRadius = magnetStacks * 2;
      for (const t of this.scene.treasures) {
        if (!t.collected && manhattan(playerPos, t.pos) <= magnetRadius) {
          this.collectTreasure(t);
        }
      }
    }
  }

  private collectAt(pos: TilePos) {
    const t = this.scene.treasures.find(
      (tr) => !tr.collected && tr.pos.x === pos.x && tr.pos.y === pos.y,
    );
    if (t) this.collectTreasure(t);
  }

  private collectTreasure(t: Treasure) {
    t.collect();
    const typeKey = t.type === "coin" ? "coin" : t.type === "gem" ? "gem" : "golden_ticket";
    useGameStore.getState().addTreasure(typeKey, t.value);
    this.scene.events.emit("treasure:collected", t);
  }
}
