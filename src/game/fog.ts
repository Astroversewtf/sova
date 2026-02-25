/**
 * Fog of War system.
 *
 * Each tile has a visibility state:
 *   0 = unexplored (fully black)
 *   1 = explored but not currently visible (dimmed)
 *   2 = currently visible (bright)
 *
 * Uses simple line-of-sight with radius check.
 */

export type Visibility = 0 | 1 | 2;

export class FogOfWar {
  private visibility: Visibility[][];
  private width: number;
  private height: number;
  private wallGrid: boolean[][]; // true = blocked

  constructor(width: number, height: number, wallGrid: (row: number, col: number) => boolean) {
    this.width = width;
    this.height = height;
    this.visibility = Array.from({ length: height }, () =>
      Array<Visibility>(width).fill(0)
    );
    this.wallGrid = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => wallGrid(y, x))
    );
  }

  /**
   * Update visibility from a given player position.
   * Previously visible tiles become "explored" (1).
   * Tiles within radius become "visible" (2).
   */
  update(px: number, py: number, radius: number) {
    // Dim all previously visible tiles
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.visibility[y][x] === 2) {
          this.visibility[y][x] = 1;
        }
      }
    }

    // Reveal tiles within radius using raycasting
    const r2 = radius * radius;

    for (let y = Math.max(0, py - radius); y <= Math.min(this.height - 1, py + radius); y++) {
      for (let x = Math.max(0, px - radius); x <= Math.min(this.width - 1, px + radius); x++) {
        const dx = x - px;
        const dy = y - py;
        if (dx * dx + dy * dy > r2) continue;

        // Simple raycast from player to target
        if (this.hasLineOfSight(px, py, x, y)) {
          this.visibility[y][x] = 2;
        }
      }
    }
  }

  private hasLineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    // Bresenham's line for LOS check
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;

    while (cx !== x1 || cy !== y1) {
      // If we hit a wall before reaching target, no LOS
      // (but walls themselves are visible if adjacent)
      if ((cx !== x0 || cy !== y0) && this.wallGrid[cy][cx]) {
        // The wall tile itself is visible, but we can't see past it
        // Allow seeing the wall tile
        if (cx === x1 && cy === y1) return true;
        return false;
      }

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }

    return true;
  }

  getVisibility(x: number, y: number): Visibility {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
    return this.visibility[y][x];
  }

  /** Get alpha value for fog overlay at this tile */
  getFogAlpha(x: number, y: number): number {
    const vis = this.getVisibility(x, y);
    if (vis === 2) return 0;       // fully visible — no fog
    if (vis === 1) return 0.6;     // explored but dim
    return 1;                       // unexplored — full black
  }
}
