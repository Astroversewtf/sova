import Phaser from "phaser";
import { FogState, CellType, type TilePos } from "../types";
import { TILE_SIZE, TILE_FULL_H } from "../constants";
import type { GameScene } from "../scenes/GameScene";

/**
 * Fog of War — MoG-style black fog with organic noisy edges.
 *  UNEXPLORED = solid black
 *  EXPLORED   = near-black (dimly visible structure)
 *  VISIBLE    = clear, with noisy boundary creating organic edges
 */
export class FogOfWar {
  private grid: FogState[][];
  private graphics: Phaser.GameObjects.Graphics;
  private mapW: number;
  private mapH: number;

  constructor(scene: GameScene, w: number, h: number, _cells: CellType[][]) {
    this.mapW = w;
    this.mapH = h;
    this.grid = Array.from({ length: h }, () =>
      Array<FogState>(w).fill(FogState.UNEXPLORED),
    );
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(800);
  }

  /** Deterministic per-tile noise: returns 0–1, consistent for same (x,y) */
  private tileNoise(x: number, y: number): number {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = ((h ^ (h >> 13)) * 1274126177) | 0;
    h = h ^ (h >> 16);
    return ((h & 0x7fff) / 0x7fff);
  }

  update(playerPos: TilePos, radius: number) {
    // Demote visible → explored
    for (let y = 0; y < this.mapH; y++) {
      for (let x = 0; x < this.mapW; x++) {
        if (this.grid[y][x] === FogState.VISIBLE) {
          this.grid[y][x] = FogState.EXPLORED;
        }
      }
    }

    // Reveal within noisy radius (organic circle)
    const reach = radius + 2; // check a bit beyond radius for noise
    for (let y = Math.max(0, playerPos.y - reach); y <= Math.min(this.mapH - 1, playerPos.y + reach); y++) {
      for (let x = Math.max(0, playerPos.x - reach); x <= Math.min(this.mapW - 1, playerPos.x + reach); x++) {
        const dx = x - playerPos.x;
        const dy = y - playerPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Noise offset: -1.2 to +1.2 tiles of variation at the boundary
        const noise = this.tileNoise(x, y) * 2.4 - 1.2;

        if (dist + noise <= radius) {
          this.grid[y][x] = FogState.VISIBLE;
        }
      }
    }

    this.redraw(playerPos, radius);
  }

  private redraw(playerPos: TilePos, radius: number) {
    this.graphics.clear();

    for (let y = 0; y < this.mapH; y++) {
      for (let x = 0; x < this.mapW; x++) {
        const state = this.grid[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_FULL_H;

        if (state === FogState.UNEXPLORED) {
          // Solid black
          this.graphics.fillStyle(0x000000, 1.0);
          this.graphics.fillRect(px - 1, py - 1, TILE_SIZE + 2, TILE_FULL_H + 2);
        } else if (state === FogState.EXPLORED) {
          // Near-black — structure barely visible
          this.graphics.fillStyle(0x000000, 0.82);
          this.graphics.fillRect(px, py, TILE_SIZE, TILE_FULL_H);
        } else {
          // VISIBLE — darken edges for smooth fade into fog
          const dx = x - playerPos.x;
          const dy = y - playerPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const noise = this.tileNoise(x, y) * 2.4 - 1.2;
          const effectiveDist = dist + noise;
          const edgeStart = radius * 0.5;

          if (effectiveDist > edgeStart) {
            // Gradual darkening toward the noisy boundary
            const t = (effectiveDist - edgeStart) / (radius - edgeStart);
            const alpha = Math.min(0.5, t * t * 0.5);
            this.graphics.fillStyle(0x000000, alpha);
            this.graphics.fillRect(px, py, TILE_SIZE, TILE_FULL_H);
          }
        }
      }
    }
  }

  isVisible(pos: TilePos): boolean {
    if (pos.x < 0 || pos.y < 0 || pos.x >= this.mapW || pos.y >= this.mapH) return false;
    return this.grid[pos.y][pos.x] === FogState.VISIBLE;
  }

  isExplored(pos: TilePos): boolean {
    if (pos.x < 0 || pos.y < 0 || pos.x >= this.mapW || pos.y >= this.mapH) return false;
    return this.grid[pos.y][pos.x] !== FogState.UNEXPLORED;
  }

  destroy() {
    this.graphics.destroy();
  }
}
