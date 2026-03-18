import {
  EnemyType,
  TreasureType,
  type BuffId,
  type EvolutionPath,
  type UpgradeDef,
  type UpgradeRarity,
} from "./types";

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

export function getVisionRadius(energy: number): number {
  for (const entry of VISION_TABLE) {
    if (energy >= entry.min) return entry.radius;
  }
  return 3;
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
  weights: Array<{ type: EnemyType; weight: number }>;
}

export function getEnemySpawnConfig(floor: number): EnemySpawnConfig {
  let min: number, max: number;
  if (floor <= 2)       { min = 8; max = 10; }
  else if (floor <= 4)  { min = 10; max = 12; }
  else if (floor <= 6)  { min = 12; max = 14; }
  else if (floor <= 8)  { min = 14; max = 16; }
  else                  { min = 16; max = 20; }

  let weights: Array<{ type: EnemyType; weight: number }>;
  if (floor <= 2) {
    // Early floors: Rock + Rock2 only.
    weights = [
      { type: EnemyType.ROCK, weight: 0.7 },
      { type: EnemyType.ROCK2, weight: 0.3 },
    ];
  } else if (floor <= 3) {
    // Golem enters before Ghost.
    weights = [
      { type: EnemyType.ROCK, weight: 0.4 },
      { type: EnemyType.ROCK2, weight: 0.35 },
      { type: EnemyType.GOLEM, weight: 0.25 },
    ];
  } else if (floor <= 4) {
    weights = [
      { type: EnemyType.ROCK, weight: 0.35 },
      { type: EnemyType.ROCK2, weight: 0.3 },
      { type: EnemyType.GOLEM, weight: 0.25 },
      { type: EnemyType.GHOST, weight: 0.1 },
    ];
  } else if (floor <= 6) {
    // Tree enters from F5.
    weights = [
      { type: EnemyType.ROCK, weight: 0.22 },
      { type: EnemyType.ROCK2, weight: 0.22 },
      { type: EnemyType.GOLEM, weight: 0.2 },
      { type: EnemyType.GHOST, weight: 0.18 },
      { type: EnemyType.FLYING_ROCK, weight: 0.1 },
      { type: EnemyType.TREE, weight: 0.08 },
    ];
  } else if (floor <= 8) {
    weights = [
      { type: EnemyType.ROCK, weight: 0.16 },
      { type: EnemyType.ROCK2, weight: 0.16 },
      { type: EnemyType.GOLEM, weight: 0.18 },
      { type: EnemyType.GHOST, weight: 0.2 },
      { type: EnemyType.FLYING_ROCK, weight: 0.14 },
      { type: EnemyType.TREE, weight: 0.16 },
    ];
  } else {
    weights = [
      { type: EnemyType.ROCK, weight: 0.12 },
      { type: EnemyType.ROCK2, weight: 0.12 },
      { type: EnemyType.GOLEM, weight: 0.16 },
      { type: EnemyType.GHOST, weight: 0.2 },
      { type: EnemyType.FLYING_ROCK, weight: 0.18 },
      { type: EnemyType.TREE, weight: 0.22 },
    ];
  }

  return { min, max, weights };
}

// ── Enemy base stats (fixed — tier multiplier applied separately) ──
export function getEnemyHP(type: EnemyType): number {
  switch (type) {
    case EnemyType.ROCK:
      return 1;
    case EnemyType.ROCK2:
      return 1;
    case EnemyType.GOLEM:
      return 1;
    case EnemyType.GHOST:
      return 3;
    case EnemyType.FLYING_ROCK:
      return 3;
    case EnemyType.TREE:
      return 4;
    case EnemyType.BOSS:
      return 7;
  }
}

export function getEnemyDMG(type: EnemyType): number {
  switch (type) {
    case EnemyType.ROCK:
      return 1;
    case EnemyType.ROCK2:
      return 1;
    case EnemyType.GOLEM:
      return 1;
    case EnemyType.GHOST:
      return 2;
    case EnemyType.FLYING_ROCK:
      return 2;
    case EnemyType.TREE:
      return 3;
    case EnemyType.BOSS:
      return 7;
  }
}

export function getDetectionRange(type: EnemyType): number {
  switch (type) {
    case EnemyType.ROCK:
      return 5;
    case EnemyType.ROCK2:
      return 5;
    case EnemyType.GOLEM:
      return 5;
    case EnemyType.GHOST:
      return 4;
    case EnemyType.FLYING_ROCK:
      return 5;
    case EnemyType.TREE:
      return 5;
    case EnemyType.BOSS:
      return 5;
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
  [TreasureType.COIN]: 10,
  [TreasureType.ORB]: 1,
  [TreasureType.GOLDEN_TICKET]: 1,
};

// ── Boss ──
export const BOSS_MIN_FLOOR = 7;

/**
 * Fixed SOVA boss spawn chance by floor (from F7 onward).
 */
export function getBossSpawnChance(floor: number): number {
  if (floor < BOSS_MIN_FLOOR) return 0;
  return 0.08;
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
  ENEMY_ROCK2: 0x8b7355,     // earth brown (rock2)
  ENEMY_ROCK2_DARK: 0x6b5635,
  ENEMY_GOLEM: 0x8b7355,     // brown/earth golem
  ENEMY_GOLEM_DARK: 0x6b5635, // brown shadow
  ENEMY_GHOST: 0x9ca3af,     // grey ghost
  ENEMY_GHOST_DARK: 0x6b7280, // grey shadow
  ENEMY_FLYING_ROCK: 0x7dd3fc, // icy cyan
  ENEMY_FLYING_ROCK_DARK: 0x0f766e,
  ENEMY_TREE: 0x65a30d,      // mossy green
  ENEMY_TREE_DARK: 0x3f6212,
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
  { tier: 2, name: "Warmup",   hpMult: 1.20, dmgMult: 1.15, lootMult: 1.50 },
  { tier: 3, name: "Shift",    hpMult: 1.30, dmgMult: 1.25, lootMult: 1.70 },
  { tier: 4, name: "Danger",   hpMult: 1.40, dmgMult: 1.55, lootMult: 1.90 },
  { tier: 5, name: "Pro",      hpMult: 1.50, dmgMult: 1.75, lootMult: 2.10 },
];

export function getTier(floor: number): TierData {
  if (floor <= 2) return TIERS[0];
  if (floor <= 4) return TIERS[1];
  if (floor <= 6) return TIERS[2];
  if (floor <= 10) return TIERS[3];
  return TIERS[4];
}

// ── Upgrade system: Build (Evolution) + Buffs ──
export type FloorBand = "f1_2" | "f3_4" | "f5_6" | "f7_plus";

export function getFloorBand(floor: number): FloorBand {
  if (floor <= 2) return "f1_2";
  if (floor <= 4) return "f3_4";
  if (floor <= 6) return "f5_6";
  return "f7_plus";
}

export const EVOLUTION_UPGRADES: UpgradeDef[] = [
  {
    id: "evo_rift_fang_t1",
    kind: "evolution",
    path: "attack",
    tier: 1,
    name: "Rift Fang",
    description: "+0.5 DMG",
    rarity: "epic",
    icon: "/sprites/upgrades/build/evo_rift_fang_t1.png",
    unlockFloor: 1,
  },
  {
    id: "evo_rift_fang_t2",
    kind: "evolution",
    path: "attack",
    tier: 2,
    name: "Rift Fang",
    description: "+0.5 DMG",
    rarity: "epic",
    icon: "/sprites/upgrades/build/evo_rift_fang_t2.png",
    unlockFloor: 1,
  },
  {
    id: "evo_rift_fang_t3",
    kind: "evolution",
    path: "attack",
    tier: 3,
    name: "Rift Fang",
    description: "+1 DMG +20% Crit",
    rarity: "epic",
    icon: "/sprites/upgrades/build/evo_rift_fang_t3.png",
    unlockFloor: 1,
  },
  {
    id: "evo_stone_veil_t1",
    kind: "evolution",
    path: "defense",
    tier: 1,
    name: "Stone Veil",
    description: "-0.5 DMG received",
    rarity: "epic",
    icon: "/sprites/upgrades/build/evo_stone_veil_t1.png",
    unlockFloor: 1,
  },
  {
    id: "evo_stone_veil_t2",
    kind: "evolution",
    path: "defense",
    tier: 2,
    name: "Stone Veil",
    description: "-0.5 DMG received",
    rarity: "epic",
    icon: "/sprites/upgrades/build/evo_stone_veil_t2.png",
    unlockFloor: 1,
  },
  {
    id: "evo_stone_veil_t3",
    kind: "evolution",
    path: "defense",
    tier: 3,
    name: "Stone Veil",
    description: "-1 DMG received +20% Dodge",
    rarity: "epic",
    icon: "/sprites/upgrades/build/evo_stone_veil_t3.png",
    unlockFloor: 1,
  },
  {
    id: "evo_volt_core_t1",
    kind: "evolution",
    path: "utility",
    tier: 1,
    name: "Volt Core",
    description: "+15 Max Energy +5% Regen",
    rarity: "epic",
    icon: "/sprites/upgrades/build/evo_volt_core_t1.png",
    unlockFloor: 1,
  },
  {
    id: "evo_volt_core_t2",
    kind: "evolution",
    path: "utility",
    tier: 2,
    name: "Volt Core",
    description: "+15 Max Energy +5% Regen",
    rarity: "epic",
    icon: "/sprites/upgrades/build/evo_volt_core_t2.png",
    unlockFloor: 1,
  },
  {
    id: "evo_volt_core_t3",
    kind: "evolution",
    path: "utility",
    tier: 3,
    name: "Volt Core",
    description: "+20 Max Energy +10% Regen",
    rarity: "epic",
    icon: "/sprites/upgrades/build/evo_volt_core_t3.png",
    unlockFloor: 1,
  },
];

export const BUFF_UPGRADES: UpgradeDef[] = [
  {
    id: "buff_field_patch",
    kind: "buff",
    name: "Field Patch",
    description: "Heal 15 now",
    rarity: "common",
    icon: "/sprites/upgrades/buff/buff_field_patch.png",
    unlockFloor: 1,
    instantHeal: 15,
  },
  {
    id: "buff_loot_magnet",
    kind: "buff",
    name: "Loot Magnet",
    description: "Auto-collect +2 tiles (3 rounds)",
    rarity: "common",
    icon: "/sprites/upgrades/buff/buff_loot_magnet.png",
    unlockFloor: 1,
    durationRounds: 3,
  },
  {
    id: "buff_quick_burst",
    kind: "buff",
    name: "Quick Burst",
    description: "10 free moves",
    rarity: "common",
    icon: "/sprites/upgrades/buff/buff_quick_burst.png",
    unlockFloor: 1,
    freeMoves: 10,
  },
  {
    id: "buff_trap_echo",
    kind: "buff",
    name: "Trap Echo",
    description: "Reveal traps (3 rounds)",
    rarity: "rare",
    icon: "/sprites/upgrades/buff/buff_trap_echo.png",
    unlockFloor: 3,
    durationRounds: 3,
  },
  {
    id: "buff_treasure_window",
    kind: "buff",
    name: "Treasure Window",
    description: "x2 Coins/Orbs (3 rounds)",
    rarity: "rare",
    icon: "/sprites/upgrades/buff/buff_treasure_window.png",
    unlockFloor: 5,
    durationRounds: 3,
    lootMultiplier: 2,
  },
  {
    id: "buff_keen_edge",
    kind: "buff",
    name: "Keen Edge",
    description: "+10% Crit (3 rounds)",
    rarity: "rare",
    icon: "/sprites/upgrades/buff/buff_keen_edge.png",
    unlockFloor: 3,
    durationRounds: 3,
    critChance: 0.1,
  },
  {
    id: "buff_emergency_mend",
    kind: "buff",
    name: "Emergency Mend",
    description: "Heal 25 now",
    rarity: "rare",
    icon: "/sprites/upgrades/buff/buff_emergency_mend.png",
    unlockFloor: 3,
    instantHeal: 25,
  },
  {
    id: "buff_momentum_rush",
    kind: "buff",
    name: "Momentum Rush",
    description: "20 free moves",
    rarity: "epic",
    icon: "/sprites/upgrades/buff/buff_momentum_rush.png",
    unlockFloor: 5,
    freeMoves: 20,
  },
  {
    id: "buff_golden_drift",
    kind: "buff",
    name: "Golden Drift",
    description: "+20% extra drop",
    rarity: "epic",
    icon: "/sprites/upgrades/buff/buff_golden_drift.png",
    unlockFloor: 7,
    durationRounds: null,
    extraDropChance: 0.2,
  },
  {
    id: "buff_execution_swing",
    kind: "buff",
    name: "Execution Swing",
    description: "+1 DMG (1 round)",
    rarity: "epic",
    icon: "/sprites/upgrades/buff/buff_execution_swing.png",
    unlockFloor: 7,
    durationRounds: 1,
  },
];

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  [...EVOLUTION_UPGRADES, ...BUFF_UPGRADES].map((u) => [u.id, u]),
);

export const UPGRADES: UpgradeDef[] = [...EVOLUTION_UPGRADES, ...BUFF_UPGRADES];

export function getUpgradeRarityChances(floor: number): Record<UpgradeRarity, number> {
  if (floor <= 2) return { common: 0.85, rare: 0.15, epic: 0 };
  if (floor <= 4) return { common: 0.7, rare: 0.27, epic: 0.03 };
  if (floor <= 6) return { common: 0.55, rare: 0.35, epic: 0.1 };
  return { common: 0.4, rare: 0.4, epic: 0.2 };
}

export function getEvolutionPathWeights(floor: number): Record<EvolutionPath, number> {
  if (floor <= 2) return { attack: 40, defense: 35, utility: 25 };
  if (floor <= 4) return { attack: 38, defense: 34, utility: 28 };
  if (floor <= 6) return { attack: 35, defense: 33, utility: 32 };
  return { attack: 34, defense: 33, utility: 33 };
}

const BUFF_WEIGHTS_BY_BAND: Record<BuffId, Record<FloorBand, number>> = {
  buff_field_patch: { f1_2: 24, f3_4: 18, f5_6: 12, f7_plus: 8 },
  buff_loot_magnet: { f1_2: 22, f3_4: 16, f5_6: 10, f7_plus: 8 },
  buff_quick_burst: { f1_2: 18, f3_4: 14, f5_6: 8, f7_plus: 6 },
  buff_trap_echo: { f1_2: 0, f3_4: 12, f5_6: 10, f7_plus: 8 },
  buff_keen_edge: { f1_2: 0, f3_4: 10, f5_6: 12, f7_plus: 12 },
  buff_emergency_mend: { f1_2: 0, f3_4: 8, f5_6: 10, f7_plus: 10 },
  buff_treasure_window: { f1_2: 0, f3_4: 0, f5_6: 12, f7_plus: 10 },
  buff_momentum_rush: { f1_2: 0, f3_4: 0, f5_6: 8, f7_plus: 10 },
  buff_golden_drift: { f1_2: 0, f3_4: 0, f5_6: 0, f7_plus: 9 },
  buff_execution_swing: { f1_2: 0, f3_4: 0, f5_6: 0, f7_plus: 8 },
};

export function getBuffWeight(buffId: BuffId, floor: number): number {
  const band = getFloorBand(floor);
  return BUFF_WEIGHTS_BY_BAND[buffId][band];
}
