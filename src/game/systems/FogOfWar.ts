import Phaser from "phaser";
import { CellType, FogState, type TilePos } from "../types";
import { TILE_SIZE, GAME_WIDTH, GAME_HEIGHT, CAMERA_ZOOM } from "../constants";

/**
 * Fog of War — MoG-style tile-per-tile black rectangles with raycasting.
 *
 *  State 0 (UNEXPLORED) = solid black (α 1.0)
 *  State 1 (EXPLORED)   = dark overlay (α 0.7)
 *  State 2 (VISIBLE)    = clear (nothing drawn)
 *
 * Uses Bresenham raycasting so vision doesn't pass through walls.
 * Smooth reveal animation via per-tile alpha interpolation.
 */
export class FogOfWar {
  private fogState: Uint8Array;
  private previousFogState: Uint8Array;
  private revealAlpha: Float32Array;
  private cellData: Uint8Array;
  private graphics: Phaser.GameObjects.Graphics;
  private mapW: number;
  private mapH: number;
  private needsRedraw = true;
  private readonly WALL_REVEAL_DEPTH = 2;
  /** Visible wall-fill tiles outside map bounds (north-only extension). */
  private outsideVisibleNorth = new Set<string>();
  /** Extra tiles of fog drawn outside map bounds to hide void */
  private readonly PAD: number;

  constructor(scene: Phaser.Scene, w: number, h: number, cells: CellType[][]) {
    this.mapW = w;
    this.mapH = h;

    // Padding must cover all wall-fill tiles so fog hides them too
    this.PAD = Math.ceil(Math.max(
      GAME_WIDTH / (CAMERA_ZOOM * TILE_SIZE),
      GAME_HEIGHT / (CAMERA_ZOOM * TILE_SIZE),
    ) / 2) + 7;

    const size = w * h;
    this.fogState = new Uint8Array(size); // All 0 = UNEXPLORED
    this.previousFogState = new Uint8Array(size).fill(255); // Force first draw
    this.revealAlpha = new Float32Array(size).fill(1.0); // All start fully opaque

    // Flatten cells 2D array to flat Uint8Array for fast lookup
    this.cellData = new Uint8Array(size);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        this.cellData[y * w + x] = cells[y][x];
      }
    }

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(2000);
  }

  /** Whether a tile blocks line of sight */
  private isOpaque(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.mapW || y >= this.mapH) return true;
    return this.cellData[y * this.mapW + x] === CellType.VOID;
  }

  /**
   * Bresenham line-of-sight: walk from (x0,y0) to (x1,y1).
   * Returns true if no intermediate opaque tile blocks the path.
   * The target tile itself is NOT considered a blocker — walls are visible.
   */
  private hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;

    while (cx !== x1 || cy !== y1) {
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
      // If we reached the target, it's visible (even if it's a wall)
      if (cx === x1 && cy === y1) return true;
      // Intermediate tile is opaque — blocked
      if (this.isOpaque(cx, cy)) return false;
    }
    return true;
  }

  update(playerPos: TilePos, radius: number) {
    this.outsideVisibleNorth.clear();

    // Demote all VISIBLE → EXPLORED
    for (let i = 0; i < this.fogState.length; i++) {
      if (this.fogState[i] === FogState.VISIBLE) {
        this.fogState[i] = FogState.EXPLORED;
      }
    }

    // Reveal tiles within vision radius using raycasting
    const r2 = radius * radius;
    const minY = Math.max(0, playerPos.y - radius);
    const maxY = Math.min(this.mapH - 1, playerPos.y + radius);
    const minX = Math.max(0, playerPos.x - radius);
    const maxX = Math.min(this.mapW - 1, playerPos.x + radius);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - playerPos.x;
        const dy = y - playerPos.y;
        if (dx * dx + dy * dy > r2) continue;

        if (this.hasLineOfSight(playerPos.x, playerPos.y, x, y)) {
          this.fogState[y * this.mapW + x] = FogState.VISIBLE;
        }
      }
    }

    // Reveal wall context around visible FLOOR tiles with symmetric depth.
    // This avoids "very tall top wall, but only 1 tile on sides/bottom".
    const revealVoidRun = (x: number, y: number, dx: number, dy: number) => {
      for (let step = 1; step <= this.WALL_REVEAL_DEPTH; step++) {
        const rx = x + dx * step;
        const ry = y + dy * step;

        // North-only extension: if wall reveal goes above the map,
        // reveal padded wall-fill tiles there too.
        if (dy === -1 && dx === 0 && rx >= 0 && rx < this.mapW && ry < 0) {
          this.outsideVisibleNorth.add(`${rx},${ry}`);
          continue;
        }

        if (rx < 0 || ry < 0 || rx >= this.mapW || ry >= this.mapH) break;
        const idx = ry * this.mapW + rx;
        if (this.cellData[idx] !== CellType.VOID) break;
        this.fogState[idx] = FogState.VISIBLE;
      }
    };

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * this.mapW + x;
        if (this.fogState[idx] !== FogState.VISIBLE) continue;
        if (this.cellData[idx] !== CellType.FLOOR) continue;

        revealVoidRun(x, y, 0, -1); // north
        revealVoidRun(x, y, 0, 1);  // south
        revealVoidRun(x, y, -1, 0); // west
        revealVoidRun(x, y, 1, 0);  // east
      }
    }

    this.needsRedraw = true;
    this.drawFog();
  }

  /**
   * Per-frame alpha interpolation for smooth reveal transitions.
   * Call from GameScene.update(time, delta).
   */
  tick(delta: number) {
    const speed = delta * 0.005; // ~200ms to full transition
    let changed = false;

    for (let i = 0; i < this.fogState.length; i++) {
      const state = this.fogState[i];
      let target: number;
      if (state === FogState.VISIBLE) target = 0.0;
      else if (state === FogState.EXPLORED) target = 0.7;
      else target = 1.0;

      const current = this.revealAlpha[i];
      if (Math.abs(current - target) < 0.01) {
        if (current !== target) {
          this.revealAlpha[i] = target;
          changed = true;
        }
        continue;
      }

      // Lerp toward target
      if (current > target) {
        this.revealAlpha[i] = Math.max(target, current - speed);
      } else {
        this.revealAlpha[i] = Math.min(target, current + speed);
      }
      changed = true;
    }

    if (changed) {
      this.needsRedraw = true;
      this.drawFog();
    }
  }

  private drawFog() {
    if (!this.needsRedraw) return;
    this.needsRedraw = false;

    this.graphics.clear();

    const pad = this.PAD;

    // Draw fog for the extended area (map + padding on all sides)
    for (let y = -pad; y < this.mapH + pad; y++) {
      for (let x = -pad; x < this.mapW + pad; x++) {
        const inMap = x >= 0 && y >= 0 && x < this.mapW && y < this.mapH;

        let alpha: number;
        if (inMap) {
          alpha = this.revealAlpha[y * this.mapW + x];
        } else if (this.outsideVisibleNorth.has(`${x},${y}`)) {
          // Reveal top wall-fill continuation when vision reaches map edge.
          alpha = 0.0;
        } else {
          // Outside map = always solid black (hide void)
          alpha = 1.0;
        }

        if (alpha < 0.01) continue; // Effectively visible, skip

        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        this.graphics.fillStyle(0x000000, alpha);
        this.graphics.fillRect(px, py, TILE_SIZE, TILE_SIZE);
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
