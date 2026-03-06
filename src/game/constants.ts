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
  // Visible area at zoom 2x = 800×450 px = 25×14 tiles
  // Grids sized to fit 5-15 rooms with 2-wide passages
  if (floor <= 2) return { w: 34, h: 22 };
  if (floor <= 4) return { w: 38, h: 26 };
  if (floor <= 6) return { w: 42, h: 28 };
  if (floor <= 8) return { w: 48, h: 32 };
  if (floor <= 10) return { w: 52, h: 34 };
  return { w: 56, h: 38 };
}

// ── Enemy spawn config per floor ──
export interface EnemySpawnConfig {
  min: number;
  max: number;
  rockPct: number;
  golemPct: number;
  // ghostPct = 1 - rockPct - golemPct
}

export function getEnemySpawnConfig(floor: number): EnemySpawnConfig {
  let min: number, max: number;
  if (floor <= 2)       { min = 5; max = 7; }
  else if (floor <= 4)  { min = 5; max = 7; }
  else if (floor <= 6)  { min = 6; max = 8; }
  else if (floor <= 10) { min = 7; max = 9; }
  else                  { min = 8; max = 10; }

  let rockPct: number, golemPct: number;
  if (floor <= 2) {
    // 60% Rock, 40% Golem, 0% Ghost
    rockPct = 0.6; golemPct = 0.4;
  } else if (floor <= 4) {
    // 40% Rock, 30% Golem, 30% Ghost
    rockPct = 0.4; golemPct = 0.3;
  } else {
    // 30% Rock, 30% Golem, 40% Ghost
    rockPct = 0.3; golemPct = 0.3;
  }

  return { min, max, rockPct, golemPct };
}

// ── Enemy base stats (fixed — tier multiplier applied separately) ──
export function getEnemyHP(type: EnemyType): number {
  switch (type) {
    case EnemyType.ROCK:
      return 1;
    case EnemyType.GOLEM:
      return 1;
    case EnemyType.GHOST:
      return 3;
    case EnemyType.BOSS:
      return 15;
  }
}

export function getEnemyDMG(type: EnemyType): number {
  switch (type) {
    case EnemyType.ROCK:
      return 2;
    case EnemyType.GOLEM:
      return 2;
    case EnemyType.GHOST:
      return 4;
    case EnemyType.BOSS:
      return 12;
  }
}

export function getDetectionRange(type: EnemyType): number {
  switch (type) {
    case EnemyType.ROCK:
      return 5;
    case EnemyType.GOLEM:
      return 5;
    case EnemyType.GHOST:
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
  [TreasureType.ENERGY]: 0.3,
  [TreasureType.COIN]: 0.4,
  [TreasureType.ORB]: 0.2,
  [TreasureType.GOLDEN_TICKET]: 0.1,
};

export const TREASURE_VALUES: Record<TreasureType, number> = {
  [TreasureType.ENERGY]: 5,
  [TreasureType.COIN]: 1,
  [TreasureType.ORB]: 5,
  [TreasureType.GOLDEN_TICKET]: 20,
};

// ── Boss ──
export const BOSS_MIN_FLOOR = 7;

/**
 * Dynamic SOVA boss spawn chance by floor.
 * F7: 8%, F8: 18%, F9: 28%, F10: 38%, F11+: 50% cap.
 */
export function getBossSpawnChance(floor: number): number {
  if (floor < BOSS_MIN_FLOOR) return 0;
  if (floor >= 11) return 0.5;
  return 0.08 + (floor - BOSS_MIN_FLOOR) * 0.1;
}

// ── Spawn safety ──
export const SPAWN_SAFE_RADIUS = 3;
export const MIN_STAIRS_DISTANCE_RATIO = 0.6;

// ── Tween durations (ms) ──
export const PLAYER_MOVE_MS = 100;
export const ENEMY_MOVE_MS = 80;

// ── Camera ──
export const CAMERA_ZOOM = 2.0;
export const CAMERA_LERP = 1;

// ── Colors (Maze of Gains teal dungeon palette) ──
export const C = {
  // Dungeon background — matches wall top so void blends with walls
  VOID_BG: 0x1a3832,

  // Floor tiles — sunset gold checkerboard
  FLOOR_TOP: 0xffb463,       // light sunset gold
  FLOOR_DEPTH: 0xa8682f,     // depth face
  FLOOR_HIGHLIGHT: 0xffcb8f, // edge highlight
  FLOOR_TOP_ALT: 0xd78435,   // dark sunset gold (checkerboard)
  FLOOR_DEPTH_ALT: 0x8b5525, // darker depth face
  FLOOR_CRACK: 0xa56a2e,     // subtle cracks on floor

  // Player — chibi knight (warm skin + armor)
  PLAYER_BODY: 0x4a90d9,     // blue armor
  PLAYER_BODY_DARK: 0x3570b0, // armor shadow
  PLAYER_SKIN: 0xfdd0a0,     // skin
  PLAYER_HAIR: 0x8b5e3c,     // hair
  PLAYER_SWORD: 0xd4d4d8,    // sword blade
  PLAYER_SWORD_HANDLE: 0x8b6914, // sword handle
  PLAYER_EYES: 0x1a1a2e,     // dark eyes

  // Enemies
  ENEMY_ROCK: 0xf472b6,      // pink rock
  ENEMY_ROCK_DARK: 0xdb2777, // pink shadow
  ENEMY_GOLEM: 0x8b7355,     // brown/earth golem
  ENEMY_GOLEM_DARK: 0x6b5635, // brown shadow
  ENEMY_GHOST: 0x9ca3af,     // grey ghost
  ENEMY_GHOST_DARK: 0x6b7280, // grey shadow
  ENEMY_BOSS: 0x8b5cf6,      // purple boss
  ENEMY_BOSS_DARK: 0x6d28d9, // boss shadow

  // Treasure
  TREASURE_COIN: 0xfbbf24,   // gold coin
  TREASURE_COIN_DARK: 0xd97706,
  TREASURE_ORB: 0xa78bfa,    // purple gem
  TREASURE_ORB_DARK: 0x7c3aed,
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

// ── Floor Tier system (progressive difficulty) ──
export interface TierData {
  tier: number;
  name: string;
  hpMult: number;
  dmgMult: number;
  lootMult: number;
}

const TIERS: TierData[] = [
  { tier: 1, name: "Tutorial", hpMult: 1.00, dmgMult: 1.00, lootMult: 1.00 },
  { tier: 2, name: "Warmup",   hpMult: 1.20, dmgMult: 1.15, lootMult: 1.30 },
  { tier: 3, name: "Shift",    hpMult: 1.30, dmgMult: 1.25, lootMult: 1.40 },
  { tier: 4, name: "Danger",   hpMult: 1.40, dmgMult: 1.35, lootMult: 1.50 },
  { tier: 5, name: "Pro",      hpMult: 1.50, dmgMult: 1.45, lootMult: 1.60 },
];

export function getTier(floor: number): TierData {
  if (floor <= 2) return TIERS[0];
  if (floor <= 4) return TIERS[1];
  if (floor <= 6) return TIERS[2];
  if (floor <= 10) return TIERS[3];
  return TIERS[4];
}

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
