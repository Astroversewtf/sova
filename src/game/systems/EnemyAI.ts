import { EnemyType, CellType, type TilePos } from "../types";
import type { Enemy } from "../entities/Enemy";
import type { GameScene } from "../scenes/GameScene";

function manhattan(a: TilePos, b: TilePos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export class EnemyAI {
  private scene: GameScene;

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  processAllEnemies(onComplete: () => void) {
    const alive = this.scene.enemies.filter((e) => e.isAlive());
    this.processNext(alive, 0, onComplete);
  }

  private processNext(queue: Enemy[], idx: number, onComplete: () => void) {
    if (idx >= queue.length) {
      onComplete();
      return;
    }

    const enemy = queue[idx];
    const move = this.decideMove(enemy);

    if (!move) {
      this.processNext(queue, idx + 1, onComplete);
      return;
    }

    const playerPos = this.scene.player.pos;

    // Enemy tries to move onto player → attack
    if (move.x === playerPos.x && move.y === playerPos.y) {
      this.scene.combatSystem.resolveEnemyBump(enemy, this.scene.player);
      this.processNext(queue, idx + 1, onComplete);
      return;
    }

    // Check no other enemy occupies target
    const occupied = this.scene.enemies.some(
      (e) => e !== enemy && e.isAlive() && e.pos.x === move.x && e.pos.y === move.y,
    );
    if (occupied) {
      this.processNext(queue, idx + 1, onComplete);
      return;
    }

    enemy.moveTo(move, () => {
      this.processNext(queue, idx + 1, onComplete);
    });
  }

  private decideMove(enemy: Enemy): TilePos | null {
    const playerPos = this.scene.player.pos;
    const d = manhattan(enemy.pos, playerPos);

    switch (enemy.type) {
      case EnemyType.BASIC:
        if (d <= enemy.detectionRange) enemy.active = true;
        if (enemy.active) return this.moveToward(enemy.pos, playerPos);
        return this.randomStep(enemy.pos);

      case EnemyType.TANKY:
        if (d <= enemy.detectionRange) enemy.active = true;
        if (enemy.active) return this.moveToward(enemy.pos, playerPos);
        return null; // Stays still

      case EnemyType.BOSS:
        return this.moveToward(enemy.pos, playerPos);
    }
  }

  /** Greedy 1-step toward target */
  private moveToward(from: TilePos, to: TilePos): TilePos | null {
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);

    // Prefer axis with larger delta
    const candidates: TilePos[] = [];
    if (Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)) {
      if (dx !== 0) candidates.push({ x: from.x + dx, y: from.y });
      if (dy !== 0) candidates.push({ x: from.x, y: from.y + dy });
    } else {
      if (dy !== 0) candidates.push({ x: from.x, y: from.y + dy });
      if (dx !== 0) candidates.push({ x: from.x + dx, y: from.y });
    }

    for (const c of candidates) {
      if (this.isWalkable(c)) return c;
    }
    return null;
  }

  /** Random step for patrolling basics */
  private randomStep(from: TilePos): TilePos | null {
    const dirs: TilePos[] = [
      { x: from.x + 1, y: from.y },
      { x: from.x - 1, y: from.y },
      { x: from.x, y: from.y + 1 },
      { x: from.x, y: from.y - 1 },
    ];
    // Shuffle
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const d of dirs) {
      if (this.isWalkable(d)) return d;
    }
    return null;
  }

  private isWalkable(pos: TilePos): boolean {
    const map = this.scene.floorMap;
    if (pos.x < 0 || pos.y < 0 || pos.x >= map.width || pos.y >= map.height) return false;
    return map.cells[pos.y][pos.x] !== CellType.VOID;
  }
}
