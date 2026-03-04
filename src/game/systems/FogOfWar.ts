import Phaser from "phaser";
import { FogState, type TilePos } from "../types";
import { TILE_SIZE } from "../constants";

/**
 * Fog of War — MoG-style tile-per-tile black rectangles.
 *
 *  State 0 (UNEXPLORED) = solid black (α 1.0)
 *  State 1 (EXPLORED)   = dark overlay (α 0.7)
 *  State 2 (VISIBLE)    = clear (nothing drawn)
 *
 * Uses flat Uint8Array + dirty-check to avoid redundant redraws.
 */
export class FogOfWar {
  private fogState: Uint8Array;
  private previousFogState: Uint8Array;
  private graphics: Phaser.GameObjects.Graphics;
  private mapW: number;
  private mapH: number;

  constructor(scene: Phaser.Scene, w: number, h: number) {
    this.mapW = w;
    this.mapH = h;

    const size = w * h;
    this.fogState = new Uint8Array(size); // All 0 = UNEXPLORED
    this.previousFogState = new Uint8Array(size).fill(255); // Force first draw

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(2000);
  }

  update(playerPos: TilePos, radius: number) {
    // Demote all VISIBLE → EXPLORED
    for (let i = 0; i < this.fogState.length; i++) {
      if (this.fogState[i] === FogState.VISIBLE) {
        this.fogState[i] = FogState.EXPLORED;
      }
    }

    // Reveal tiles within vision radius (simple circular check)
    const r2 = radius * radius;
    const minY = Math.max(0, playerPos.y - radius);
    const maxY = Math.min(this.mapH - 1, playerPos.y + radius);
    const minX = Math.max(0, playerPos.x - radius);
    const maxX = Math.min(this.mapW - 1, playerPos.x + radius);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - playerPos.x;
        const dy = y - playerPos.y;
        if (dx * dx + dy * dy <= r2) {
          this.fogState[y * this.mapW + x] = FogState.VISIBLE;
        }
      }
    }

    this.drawFog();
  }

  private drawFog() {
    // Dirty-check: only redraw if state actually changed
    let dirty = false;
    for (let i = 0; i < this.fogState.length; i++) {
      if (this.fogState[i] !== this.previousFogState[i]) {
        dirty = true;
        break;
      }
    }
    if (!dirty) return;

    // Copy current state to previous
    this.previousFogState.set(this.fogState);

    this.graphics.clear();

    for (let y = 0; y < this.mapH; y++) {
      for (let x = 0; x < this.mapW; x++) {
        const state = this.fogState[y * this.mapW + x];
        if (state === FogState.VISIBLE) continue; // Clear — draw nothing

        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (state === FogState.UNEXPLORED) {
          // Solid black
          this.graphics.fillStyle(0x000000, 1.0);
          this.graphics.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        } else {
          // EXPLORED — semi-transparent dark overlay
          this.graphics.fillStyle(0x000000, 0.7);
          this.graphics.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }

  isVisible(pos: TilePos): boolean {
    if (pos.x < 0 || pos.y < 0 || pos.x >= this.mapW || pos.y >= this.mapH) return false;
    return this.fogState[pos.y * this.mapW + pos.x] === FogState.VISIBLE;
  }

  isExplored(pos: TilePos): boolean {
    if (pos.x < 0 || pos.y < 0 || pos.x >= this.mapW || pos.y >= this.mapH) return false;
    return this.fogState[pos.y * this.mapW + pos.x] >= FogState.EXPLORED;
  }

  destroy() {
    this.graphics.destroy();
  }
}
