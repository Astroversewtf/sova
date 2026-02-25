import Phaser from "phaser";

// ── Tile image dimensions ──
const IMG_W = 256;
const IMG_H = 512;

// ── Diamond geometry within the image ──
// The diamond (top face) starts at y≈364 in the 256×512 image
// Diamond: 256px wide, 128px tall (standard 2:1 isometric ratio)
// Side faces extend ~20px below the diamond
const DIAMOND_W = 256;
const DIAMOND_H = 128;
const DIAMOND_TOP_Y = 364; // y in image where diamond top vertex sits
const DIAMOND_CENTER_Y = DIAMOND_TOP_Y + DIAMOND_H / 2; // ≈428

// ── Origin for Phaser sprites (aligns diamond center with position) ──
const ORIGIN_X = 0.5;
const ORIGIN_Y = DIAMOND_CENTER_Y / IMG_H; // ≈0.836

// ── Map layout ──
// 1 = stone floor, 0 = empty (void)
// Irregular shape inspired by the concept art
const MAP: number[][] = [
  [0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
];

const ROWS = MAP.length;
const COLS = MAP[0].length;

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
  }

  /** Simple seeded random for consistent tile variation */
  private seed = 0;
  private seededRandom(): number {
    this.seed = (this.seed * 16807 + 0) % 2147483647;
    return (this.seed & 0x7fffffff) / 2147483647;
  }

  /** Check if a grid cell has floor */
  private hasFloor(row: number, col: number): boolean {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
    return MAP[row][col] === 1;
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a0a1a");

    const cam = this.cameras.main;

    // ── Compute scale to fit the isometric map in the viewport ──
    // The isometric diamond occupies:
    //   width  = (COLS + ROWS) * DIAMOND_W/2
    //   height = (COLS + ROWS) * DIAMOND_H/2 + block_depth
    const mapPixelW = (COLS + ROWS) * (DIAMOND_W / 2);
    const mapPixelH = (COLS + ROWS) * (DIAMOND_H / 2) + 40; // +40 for side faces
    const padding = 0.85; // 85% of viewport
    const scaleX = (cam.width * padding) / mapPixelW;
    const scaleY = (cam.height * padding) / mapPixelH;
    const tileScale = Math.min(scaleX, scaleY);

    // Half-tile dimensions at computed scale
    const halfW = (DIAMOND_W * tileScale) / 2;
    const halfH = (DIAMOND_H * tileScale) / 2;

    // ── Center the map in viewport ──
    // The diamond center (middle of the grid) should be at screen center
    const midRow = (ROWS - 1) / 2;
    const midCol = (COLS - 1) / 2;
    const centerX = cam.width / 2 - (midCol - midRow) * halfW;
    const centerY = cam.height / 2 - (midCol + midRow) * halfH;

    // ── Floor tile variants for visual interest ──
    const floorTiles = ["stone", "stone", "stone", "stone", "stoneUneven"];

    // ── Render tiles ──
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (!this.hasFloor(row, col)) continue;

        // Isometric screen position (diamond center)
        const screenX = centerX + (col - row) * halfW;
        const screenY = centerY + (col + row) * halfH;

        // Seeded random for consistent variation
        this.seed = (col + 1) * 31 + (row + 1) * 137;
        const variant = floorTiles[
          Math.floor(this.seededRandom() * floorTiles.length)
        ];

        const tile = this.add.image(screenX, screenY, variant);
        tile.setScale(tileScale);
        tile.setOrigin(ORIGIN_X, ORIGIN_Y);
        tile.setDepth(col + row); // depth sort: tiles further forward render on top
      }
    }
  }
}
