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
    if (alive.length === 0) {
      onComplete();
      return;
    }

    const playerPos = this.scene.player.pos;
    const targetByEnemy = new Map<Enemy, TilePos | null>();
    const attackIntents: Enemy[] = [];
    const moveIntents: { enemy: Enemy; target: TilePos }[] = [];

    for (const enemy of alive) {
      const target = this.decideMove(enemy);
      targetByEnemy.set(enemy, target);
      if (!target) continue;

      if (target.x === playerPos.x && target.y === playerPos.y) {
        attackIntents.push(enemy);
      } else {
        moveIntents.push({ enemy, target });
      }
    }

    // Resolve enemy bumps first (same turn, before movement completes)
    for (const enemy of attackIntents) {
      this.scene.combatSystem.resolveEnemyBump(enemy, this.scene.player);
    }

    const byStartPos = new Map<string, Enemy>();
    for (const enemy of alive) {
      byStartPos.set(this.posKey(enemy.pos), enemy);
    }

    // Filter impossible moves and bucket collisions to same target tile.
    const moveBuckets = new Map<string, { enemy: Enemy; target: TilePos }[]>();
    for (const intent of moveIntents) {
      const occupant = byStartPos.get(this.posKey(intent.target));
      if (occupant && occupant !== intent.enemy) {
        const occupantTarget = targetByEnemy.get(occupant) ?? null;
        // Occupied by a stationary enemy.
        if (!occupantTarget) continue;
        // Block direct swap A<->B.
        if (
          occupantTarget.x === intent.enemy.pos.x &&
          occupantTarget.y === intent.enemy.pos.y
        ) {
          continue;
        }
      }

      const key = this.posKey(intent.target);
      const list = moveBuckets.get(key);
      if (list) list.push(intent);
      else moveBuckets.set(key, [intent]);
    }

    const winners: { enemy: Enemy; target: TilePos }[] = [];
    for (const bucket of moveBuckets.values()) {
      // Deterministic priority: closest enemy to player moves first.
      bucket.sort(
        (a, b) =>
          manhattan(a.enemy.pos, playerPos) - manhattan(b.enemy.pos, playerPos),
      );
      winners.push(bucket[0]);
    }

    if (winners.length === 0) {
      onComplete();
      return;
    }

    let pending = winners.length;
    for (const { enemy, target } of winners) {
      enemy.moveTo(target, () => {
        pending--;
        if (pending === 0) onComplete();
      });
    }
  }

  private decideMove(enemy: Enemy): TilePos | null {
    const playerPos = this.scene.player.pos;
    const d = manhattan(enemy.pos, playerPos);

    switch (enemy.type) {
      case EnemyType.ROCK:
        if (d <= enemy.detectionRange) enemy.active = true;
        if (enemy.active) return this.moveToward(enemy.pos, playerPos);
        return this.randomStep(enemy.pos);

      case EnemyType.GOLEM:
        if (d <= enemy.detectionRange) enemy.active = true;
        if (enemy.active) return this.moveToward(enemy.pos, playerPos);
        return null; // Stays still

      case EnemyType.GHOST:
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
    if (map.cells[pos.y][pos.x] === CellType.VOID) return false;
    // Other enemies, chests and fountain block enemy movement
    if (this.scene.getEnemyAt(pos)) return false;
    if (this.scene.getChestAt(pos)) return false;
    if (this.scene.fountain?.occupies(pos)) return false;
    return true;
  }

  private posKey(pos: TilePos): string {
    return `${pos.x},${pos.y}`;
  }
}
