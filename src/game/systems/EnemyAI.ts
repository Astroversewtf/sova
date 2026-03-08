import { EnemyType, CellType, type TilePos } from "../types";
import type { Enemy } from "../entities/Enemy";
import type { GameScene } from "../scenes/GameScene";

function manhattan(a: TilePos, b: TilePos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export class EnemyAI {
  private scene: GameScene;
  private golemTurnCounter = new Map<string, number>();
  private readonly ROCK_DEAGGRO_BUFFER = 2;
  private readonly GHOST_AGGRO_RANGE = 6;
  private readonly DIRS: TilePos[] = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  constructor(scene: GameScene) {
    this.scene = scene;
  }

  reset() {
    this.golemTurnCounter.clear();
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
        if (enemy.active && d >= enemy.detectionRange + this.ROCK_DEAGGRO_BUFFER) {
          enemy.active = false;
        }
        if (enemy.active) return this.findNextStepBFS(enemy, playerPos);
        return this.randomStep(enemy.pos);

      case EnemyType.GOLEM:
        if (d <= enemy.detectionRange) enemy.active = true;
        if (!this.shouldGolemMove(enemy)) return null;
        if (enemy.active) return this.findNextStepBFS(enemy, playerPos);
        return this.randomStep(enemy.pos);

      case EnemyType.GHOST:
        if (d <= Math.max(enemy.detectionRange, this.GHOST_AGGRO_RANGE)) {
          enemy.active = true;
        }
        if (enemy.active) return this.findNextStepBFS(enemy, playerPos);
        return this.randomStep(enemy.pos);

      case EnemyType.BOSS:
        return this.findNextStepBFS(enemy, playerPos);
    }
  }

  /** BFS shortest path on the tile grid; returns the immediate next step. */
  private findNextStepBFS(enemy: Enemy, goal: TilePos): TilePos | null {
    const start = enemy.pos;
    if (start.x === goal.x && start.y === goal.y) return null;

    const map = this.scene.floorMap;
    const w = map.width;
    const h = map.height;
    const size = w * h;

    const toIdx = (x: number, y: number) => y * w + x;
    const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;

    const startIdx = toIdx(start.x, start.y);
    const goalIdx = toIdx(goal.x, goal.y);

    const visited = new Uint8Array(size);
    const prev = new Int32Array(size).fill(-1);
    const queue: number[] = [startIdx];
    let head = 0;
    visited[startIdx] = 1;

    while (head < queue.length) {
      const cur = queue[head++];
      if (cur === goalIdx) break;

      const cx = cur % w;
      const cy = Math.floor(cur / w);

      for (const d of this.DIRS) {
        const nx = cx + d.x;
        const ny = cy + d.y;
        if (!inBounds(nx, ny)) continue;
        const ni = toIdx(nx, ny);
        if (visited[ni]) continue;
        const nextPos = { x: nx, y: ny };
        const isGoal = nx === goal.x && ny === goal.y;
        if (!this.isWalkableForEnemy(enemy, nextPos, isGoal)) continue;

        visited[ni] = 1;
        prev[ni] = cur;
        queue.push(ni);
      }
    }

    if (!visited[goalIdx]) return null;

    // Reconstruct only the first step after start.
    let cur = goalIdx;
    while (prev[cur] !== -1 && prev[cur] !== startIdx) {
      cur = prev[cur];
    }

    const nx = cur % w;
    const ny = Math.floor(cur / w);
    return { x: nx, y: ny };
  }

  /** Random step for patrolling basics */
  private randomStep(from: TilePos): TilePos | null {
    const dirs: TilePos[] = this.DIRS.map((d) => ({ x: from.x + d.x, y: from.y + d.y }));
    // Shuffle
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const d of dirs) {
      if (this.isWalkableForEnemy(null, d, false)) return d;
    }
    return null;
  }

  private shouldGolemMove(enemy: Enemy): boolean {
    const next = (this.golemTurnCounter.get(enemy.id) ?? 0) + 1;
    this.golemTurnCounter.set(enemy.id, next);
    return next % 2 === 0;
  }

  private isWalkableForEnemy(enemy: Enemy | null, pos: TilePos, isGoal: boolean): boolean {
    const map = this.scene.floorMap;
    if (pos.x < 0 || pos.y < 0 || pos.x >= map.width || pos.y >= map.height) return false;
    if (map.cells[pos.y][pos.x] === CellType.VOID) return false;

    if (isGoal) return true;

    // Other enemies, chests and fountain block enemy movement
    const occupant = this.scene.getEnemyAt(pos);
    if (occupant && occupant !== enemy) return false;
    if (this.scene.getChestAt(pos)) return false;
    if (this.scene.fountain?.occupies(pos)) return false;
    return true;
  }

  private posKey(pos: TilePos): string {
    return `${pos.x},${pos.y}`;
  }
}
