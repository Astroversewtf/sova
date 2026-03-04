import { EnemyType, TreasureType, type UpgradeDef } from "./types";

// ── Resolution & Tiles ──
export const GAME_WIDTH = 1600;
export const GAME_HEIGHT = 900;
export const TILE_SIZE = 32;
export const TILE_DEPTH = 0; // Square tiles — no depth face
export const TILE_FULL_H = TILE_SIZE + TILE_DEPTH; // 32

// ── Energy ──
export const MAX_ENERGY_BASE = 100;
export const ENERGY_PER_MOVE = 1;

// ── Vision radius by energy bracket ──
const VISION_TABLE = [
  { min: 76, radius: 7 },
  { min: 51, radius: 6 },
  { min: 26, radius: 5 },
  { min: 11, radius: 4 },
  { min: 1, radius: 3 },
];

export function getVisionRadius(energy: number, eagleEyeStacks: number): number {
  for (const entry of VISION_TABLE) {
    if (energy >= entry.min) return entry.radius + eagleEyeStacks;
  }
  return 3 + eagleEyeStacks;
}

// ── Floor size scaling ──
export function getFloorSize(floor: number): { w: number; h: number } {
  if (floor <= 3) return { w: 18, h: 15 };
  if (floor <= 6) return { w: 19, h: 16 };
  if (floor <= 9) return { w: 24, h: 20 };
  return { w: 28, h: 24 };
}

// ── Enemy counts per floor ──
export function getEnemyCount(floor: number): { basic: number; tanky: number } {
  if (floor <= 3) return { basic: 2 + floor, tanky: 0 };
  if (floor <= 6) return { basic: 3 + floor, tanky: Math.floor(floor / 2) };
  if (floor <= 9) return { basic: 4 + floor, tanky: Math.floor(floor / 2) + 1 };
  return { basic: 6 + floor, tanky: Math.floor(floor / 2) + 2 };
}

// ── Enemy stats by type & floor ──
export function getEnemyHP(type: EnemyType, floor: number): number {
  switch (type) {
    case EnemyType.BASIC:
      return 1;
    case EnemyType.TANKY:
      if (floor <= 6) return 3;
      if (floor <= 9) return 4;
      return 5;
    case EnemyType.BOSS:
      return 10 + Math.min(5, Math.floor(floor / 3));
  }
}

export function getDetectionRange(type: EnemyType): number {
  switch (type) {
    case EnemyType.BASIC:
      return 5;
    case EnemyType.TANKY:
      return 4;
    case EnemyType.BOSS:
      return 999; // Always active
  }
}

// ── Treasure ──
export function getTreasureCount(floor: number): number {
  if (floor <= 3) return 4 + floor;
  if (floor <= 6) return 6 + floor;
  if (floor <= 9) return 8 + floor;
  return 10 + floor;
}

export const TREASURE_WEIGHTS: Record<TreasureType, number> = {
  [TreasureType.COIN]: 0.6,
  [TreasureType.GEM]: 0.3,
  [TreasureType.GOLDEN_TICKET]: 0.1,
};

export const TREASURE_VALUES: Record<TreasureType, number> = {
  [TreasureType.COIN]: 1,
  [TreasureType.GEM]: 5,
  [TreasureType.GOLDEN_TICKET]: 20,
};

// ── Boss ──
export const BOSS_MIN_FLOOR = 7;
export const BOSS_CHANCE = 0.08;

// ── Spawn safety ──
export const SPAWN_SAFE_RADIUS = 3;
export const MIN_STAIRS_DISTANCE_RATIO = 0.6;

// ── Tween durations (ms) ──
export const PLAYER_MOVE_MS = 100;
export const ENEMY_MOVE_MS = 80;

// ── Camera ──
export const CAMERA_ZOOM = 2.0;
export const CAMERA_LERP = 0.1;

// ── Colors (Maze of Gains teal dungeon palette) ──
export const C = {
  // Dungeon background — matches wall top so void blends with walls
  VOID_BG: 0x1a3832,

  // Floor tiles — teal checkerboard (two alternating shades)
  FLOOR_TOP: 0x2a9d8f,       // lighter teal
  FLOOR_DEPTH: 0x1a6b62,     // depth face
  FLOOR_HIGHLIGHT: 0x45c4b4, // edge highlight
  FLOOR_TOP_ALT: 0x237a6e,   // darker teal (checkerboard)
  FLOOR_DEPTH_ALT: 0x155850, // darker depth face
  FLOOR_CRACK: 0x1e8578,     // subtle cracks on floor

  // Player — chibi knight (warm skin + armor)
  PLAYER_BODY: 0x4a90d9,     // blue armor
  PLAYER_BODY_DARK: 0x3570b0, // armor shadow
  PLAYER_SKIN: 0xfdd0a0,     // skin
  PLAYER_HAIR: 0x8b5e3c,     // hair
  PLAYER_SWORD: 0xd4d4d8,    // sword blade
  PLAYER_SWORD_HANDLE: 0x8b6914, // sword handle
  PLAYER_EYES: 0x1a1a2e,     // dark eyes

  // Enemies
  ENEMY_BASIC: 0xf472b6,     // pink blob
  ENEMY_BASIC_DARK: 0xdb2777, // pink shadow
  ENEMY_TANKY: 0x9ca3af,     // grey stone golem
  ENEMY_TANKY_DARK: 0x6b7280, // grey shadow
  ENEMY_BOSS: 0x8b5cf6,      // purple boss
  ENEMY_BOSS_DARK: 0x6d28d9, // boss shadow

  // Treasure
  TREASURE_COIN: 0xfbbf24,   // gold coin
  TREASURE_COIN_DARK: 0xd97706,
  TREASURE_GEM: 0xa78bfa,    // purple gem
  TREASURE_GEM_DARK: 0x7c3aed,
  TREASURE_RARE: 0x34d399,   // rare artifact (green glow)
  TREASURE_RARE_DARK: 0x059669,

  // Walls — dark stone surrounding floor
  WALL_TOP: 0x1a3832,        // wall top face (dark teal stone)
  WALL_FACE: 0x0f2420,       // south-facing wall cliff
  WALL_MORTAR: 0x0e1c18,     // mortar lines between bricks
  WALL_HIGHLIGHT: 0x224a42,  // subtle brick highlight

  // Stairs
  STAIRS_WOOD: 0x92693a,     // wooden stairs
  STAIRS_WOOD_DARK: 0x6b4a28,
  STAIRS_RAIL: 0x78654c,     // railing
  STAIRS_LOCKED: 0x555555,
  STAIRS_UNLOCKED: 0x10b981,

  // Statue
  STATUE: 0x78716c,
  STATUE_DARK: 0x57524e,

  // HUD
  ENERGY_HIGH: 0x4ade80,     // bright green
  ENERGY_MED: 0xfbbf24,      // yellow
  ENERGY_LOW: 0xef4444,      // red
  ENERGY_BAR_BG: 0x1f2937,
  ENERGY_BAR_BORDER: 0x374151,
  FOG: 0x0c1220,             // match void for fog
  HUD_BG: 0x111827,
  HUD_TEXT: 0xf9fafb,

  // UI
  WHITE: 0xffffff,
  SMASH_TEXT: 0xfbbf24,      // gold combat text
  ARROW_COLOR: 0xffffff,     // direction arrows
  CARD_BG: 0x1e3a5f,         // upgrade card bg (dark blue)
  CARD_BORDER: 0x2563eb,     // card border
  RARITY_COMMON: 0x9ca3af,   // grey
  RARITY_RARE: 0x3b82f6,     // blue
  RARITY_EPIC: 0xa855f7,     // purple
};

// ── Upgrade definitions ──
export const UPGRADES: UpgradeDef[] = [
  {
    id: "sharp_blade",
    name: "Sharp Blade",
    description: "+1 ATK per stack",
    stackable: true,
  },
  {
    id: "vitality_surge",
    name: "Vitality Surge",
    description: "+10 Max Energy",
    stackable: true,
  },
  {
    id: "life_steal",
    name: "Life Steal",
    description: "+2 Energy per kill",
    stackable: true,
  },
  {
    id: "eagle_eye",
    name: "Eagle Eye",
    description: "+1 vision radius",
    stackable: true,
  },
  {
    id: "thick_skin",
    name: "Thick Skin",
    description: "-1 damage taken (min 1)",
    stackable: true,
  },
  {
    id: "treasure_magnet",
    name: "Treasure Magnet",
    description: "Auto-collect 2-tile radius",
    stackable: true,
  },
  {
    id: "swift_feet",
    name: "Swift Feet",
    description: "10% chance free move",
    stackable: true,
  },
  {
    id: "second_wind",
    name: "Second Wind",
    description: "Recover 15 Energy now",
    stackable: false,
  },
];
