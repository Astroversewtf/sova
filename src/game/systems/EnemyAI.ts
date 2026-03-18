import { EnemyType, CellType, type TilePos } from "../types";
import type { Enemy } from "../entities/Enemy";
import type { GameScene } from "../scenes/GameScene";
import { useGameStore } from "@/stores/gameStore";

function manhattan(a: TilePos, b: TilePos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export class EnemyAI {
  private scene: GameScene;
  private bossHitsReceived = new Map<string, number>();
  private golemMustMoveNext = new Set<string>();
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
    this.bossHitsReceived.clear();
    this.golemMustMoveNext.clear();
  }

  registerBossHit(enemy: Enemy) {
    if (enemy.type !== EnemyType.BOSS) return;
    const next = (this.bossHitsReceived.get(enemy.id) ?? 0) + 1;
    this.bossHitsReceived.set(enemy.id, next);
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

    // Give blocked enemies (bucket losers + swap-blocked) an alternate step
    const wonSet = new Set(winners.map((w) => w.enemy));
    const claimed = new Set(winners.map((w) => this.posKey(w.target)));
    // Stationary and attacking enemies claim their current tile
    for (const e of alive) {
      if (!wonSet.has(e)) claimed.add(this.posKey(e.pos));
    }
    const blocked = moveIntents.filter((m) => !wonSet.has(m.enemy));
    for (const { enemy } of blocked) {
      const alt = this.findAlternateStep(enemy, playerPos, claimed);
      if (alt) {
        claimed.add(this.posKey(alt));
        winners.push({ enemy, target: alt });
      }
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
      case EnemyType.ROCK2:
        if (d <= enemy.detectionRange) enemy.active = true;
        if (enemy.active && d >= enemy.detectionRange + this.ROCK_DEAGGRO_BUFFER) {
          enemy.active = false;
        }
        if (enemy.active) return this.findNextStepBFS(enemy, playerPos);
        return this.randomStep(enemy.pos);

      case EnemyType.GOLEM:
        if (d <= enemy.detectionRange) enemy.active = true;
        if (enemy.active && d >= enemy.detectionRange + this.ROCK_DEAGGRO_BUFFER) {
          enemy.active = false;
        }
        {
          const desired = enemy.active
            ? this.findNextStepBFS(enemy, playerPos)
            : this.randomStep(enemy.pos);
          if (!desired) return null;

          // 20% chance to skip this turn. If skipped, next turn move is mandatory.
          if (this.golemMustMoveNext.has(enemy.id)) {
            this.golemMustMoveNext.delete(enemy.id);
            return desired;
          }
          if (Math.random() < 0.2) {
            this.golemMustMoveNext.add(enemy.id);
            return null;
          }
          return desired;
        }

      case EnemyType.GHOST:
        if (d <= Math.max(enemy.detectionRange, this.GHOST_AGGRO_RANGE)) {
          enemy.active = true;
        }
        if (enemy.active) return this.findNextStepBFS(enemy, playerPos);
        return this.randomStep(enemy.pos);

      case EnemyType.FLYING_ROCK:
        // Uses rock-like aggro/deaggro flow, but ghost-like stats.
        if (d <= enemy.detectionRange) enemy.active = true;
        if (enemy.active && d >= enemy.detectionRange + this.ROCK_DEAGGRO_BUFFER) {
          enemy.active = false;
        }
        if (enemy.active) return this.findNextStepBFS(enemy, playerPos);
        return this.randomStep(enemy.pos);

      case EnemyType.TREE:
        // Late-game pressure enemy: sticky aggro once detected.
        if (d <= Math.max(enemy.detectionRange, this.GHOST_AGGRO_RANGE)) {
          enemy.active = true;
        }
        if (enemy.active) return this.findNextStepBFS(enemy, playerPos);
        return this.randomStep(enemy.pos);

      case EnemyType.BOSS:
        enemy.active = d <= enemy.detectionRange;
        if (!enemy.active) return null;

        if (useGameStore.getState().tutorialMode) {
          return this.findNextStepBFS(enemy, playerPos);
        }

        const hits = this.bossHitsReceived.get(enemy.id) ?? 0;

        // Far from player: roam randomly (can move toward or away, both valid).
        if (d > 2) {
          return this.randomStep(enemy.pos);
        }

        // Close to player: aggressive by default.
        // After 2 hits, 50% chance to flee instead of chasing.
        if (hits >= 2 && Math.random() < 0.5) {
          const flee = this.findFleeStep(enemy, playerPos);
          if (flee) {
            this.scene.popupManager.showBossTaunt(enemy.pos.x, enemy.pos.y, "CATCH ME");
            return flee;
          }
        }

        return this.findNextStepBFS(enemy, playerPos);
    }
  }

  /** Pick an adjacent step that increases shortest-path distance from the player. */
  private findFleeStep(enemy: Enemy, playerPos: TilePos): TilePos | null {
    const map = this.scene.floorMap;
    const w = map.width;
    const h = map.height;
    const toIdx = (x: number, y: number) => y * w + x;
    const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h;

    const dist = new Int16Array(w * h).fill(-1);
    const queue: number[] = [];
    const playerIdx = toIdx(playerPos.x, playerPos.y);
    dist[playerIdx] = 0;
    queue.push(playerIdx);

    // Build distance field from player over currently traversable tiles.
    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const cx = cur % w;
      const cy = Math.floor(cur / w);

      for (const d of this.DIRS) {
        const nx = cx + d.x;
        const ny = cy + d.y;
        if (!inBounds(nx, ny)) continue;
        const ni = toIdx(nx, ny);
        if (dist[ni] !== -1) continue;
        const next = { x: nx, y: ny };
        if (!this.isTraversableForDistanceField(enemy, next, playerPos)) continue;
        dist[ni] = (dist[cur] + 1) as number;
        queue.push(ni);
      }
    }

    const currentRaw = dist[toIdx(enemy.pos.x, enemy.pos.y)];
    const currentDist = currentRaw < 0 ? Number.NEGATIVE_INFINITY : currentRaw;

    let best: TilePos | null = null;
    let bestDist = currentDist;

    for (const d of this.DIRS) {
      const nx = enemy.pos.x + d.x;
      const ny = enemy.pos.y + d.y;
      if (!inBounds(nx, ny)) continue;
      if (nx === playerPos.x && ny === playerPos.y) continue;

      const candidate = { x: nx, y: ny };
      if (!this.isWalkableForEnemy(enemy, candidate, false)) continue;

      const raw = dist[toIdx(nx, ny)];
      const score = raw < 0 ? Number.MAX_SAFE_INTEGER : raw;
      if (score > bestDist) {
        bestDist = score;
        best = candidate;
      }
    }

    // Encurralado / no better escape step.
    return best;
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

  /** Alternate step for blocked enemies — pick closest free tile toward player */
  private findAlternateStep(enemy: Enemy, playerPos: TilePos, claimed: Set<string>): TilePos | null {
    const currentDist = manhattan(enemy.pos, playerPos);
    let best: TilePos | null = null;
    let bestDist = currentDist;

    for (const d of this.DIRS) {
      const pos = { x: enemy.pos.x + d.x, y: enemy.pos.y + d.y };
      if (pos.x === playerPos.x && pos.y === playerPos.y) continue;
      if (claimed.has(this.posKey(pos))) continue;
      if (!this.isWalkableForEnemy(enemy, pos, false)) continue;

      const dist = manhattan(pos, playerPos);
      if (dist < bestDist) {
        bestDist = dist;
        best = pos;
      }
    }

    return best;
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

  private isTraversableForDistanceField(enemy: Enemy, pos: TilePos, playerPos: TilePos): boolean {
    if (pos.x === playerPos.x && pos.y === playerPos.y) return true;
    const map = this.scene.floorMap;
    if (pos.x < 0 || pos.y < 0 || pos.x >= map.width || pos.y >= map.height) return false;
    if (map.cells[pos.y][pos.x] === CellType.VOID) return false;

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
