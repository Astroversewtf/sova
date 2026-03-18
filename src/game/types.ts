/** Shared types for the SOVA game engine */

export interface TilePos {
  x: number;
  y: number;
}

export interface RoomBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export enum CellType {
  VOID = 0,
  FLOOR = 1,
}

export interface FloorMap {
  width: number;
  height: number;
  cells: CellType[][];
  spawn: TilePos;
  stairs: TilePos;
  enemySpawns: EnemySpawnData[];
  treasureSpawns: TreasureSpawnData[];
  chestSpawns: TilePos[];
  trapSpawns: TrapSpawnData[];
  fountainSpawn: TilePos | null;
  propSpawns: PropSpawnData[];
  wallPropSpawns: WallPropSpawnData[];
  bossSpawn: TilePos | null;
  statuePos: TilePos | null;
  rooms: RoomBounds[];
}

export interface EnemySpawnData {
  pos: TilePos;
  type: EnemyType;
}

export interface TreasureSpawnData {
  pos: TilePos;
  type: TreasureType;
  value: number;
}

export enum FogState {
  UNEXPLORED = 0,
  EXPLORED = 1,
  VISIBLE = 2,
}

export enum EnemyType {
  ROCK = "rock",
  ROCK2 = "rock2",
  GOLEM = "golem",
  GHOST = "ghost",
  FLYING_ROCK = "flying_rock",
  TREE = "tree",
  BOSS = "boss",
}

export enum TreasureType {
  ENERGY = "energy",
  COIN = "coin",
  ORB = "orb",
  GOLDEN_TICKET = "golden_ticket",
}

export enum TrapType {
  SPIKE = "spike",
}

export interface TrapSpawnData {
  pos: TilePos;
  type: TrapType;
  hidden?: boolean;
}

export type PropType =
  | "rock_small"
  | "rock_big"
  | "decorative_musgo_01"
  | "decorative_musgo_02"
  | "decorative_musgo_03"
  | "decorative_musgo_04"
  | "decorative_musgo_05"
  | "decorative_musgo_06"
  | "decorative_rocks_01"
  | "decorative_rocks_02"
  | "decorative_quarter01"
  | "decorative_cuarter02"
  | "decorative_cuarter_tile01"
  | "decorative_cuarter_tile02"
  | "decorative_cuarter_tile03"
  | "decorative_cuarter_tile04"
  | "decorative_cuarter_tile05"
  | "decorative_cuarter_tile06"
  | "decorative_cuarter_tile07"
  | "decorative_cuarter_tile08";
export type WallPropType = "light" | "plank";

export interface PropSpawnData {
  pos: TilePos;
  type: PropType;
}

export interface WallPropSpawnData {
  pos: TilePos;
  type: WallPropType;
}

export type EvolutionPath = "attack" | "defense" | "utility";
export type EvolutionTier = 1 | 2 | 3;

export type EvolutionId =
  | "evo_rift_fang_t1"
  | "evo_rift_fang_t2"
  | "evo_rift_fang_t3"
  | "evo_stone_veil_t1"
  | "evo_stone_veil_t2"
  | "evo_stone_veil_t3"
  | "evo_volt_core_t1"
  | "evo_volt_core_t2"
  | "evo_volt_core_t3";

export type BuffId =
  | "buff_field_patch"
  | "buff_loot_magnet"
  | "buff_quick_burst"
  | "buff_trap_echo"
  | "buff_treasure_window"
  | "buff_keen_edge"
  | "buff_emergency_mend"
  | "buff_momentum_rush"
  | "buff_golden_drift"
  | "buff_execution_swing";

export type UpgradeId = EvolutionId | BuffId;

export type UpgradeKind = "evolution" | "buff";

export type UpgradeRarity = "common" | "rare" | "epic";

export interface UpgradeDef {
  id: UpgradeId;
  kind: UpgradeKind;
  name: string;
  description: string;
  rarity: UpgradeRarity;
  icon: string;
  unlockFloor: number;
  path?: EvolutionPath;
  tier?: EvolutionTier;
  durationRounds?: number | null;
  freeMoves?: number;
  instantHeal?: number;
  extraDropChance?: number;
  lootMultiplier?: number;
  critChance?: number;
}

export interface ActiveBuffState {
  id: BuffId;
  remainingRounds: number | null;
  charges: number;
}

export enum TurnPhase {
  PLAYER_INPUT = "PLAYER_INPUT",
  PLAYER_MOVE = "PLAYER_MOVE",
  ENEMY_MOVE = "ENEMY_MOVE",
  CHECK_CONDITIONS = "CHECK_CONDITIONS",
}

export interface RunStats {
  floorsCleared: number;
  totalTreasure: number;
  coinsCollected: number;
  orbsCollected: number;
  goldenTicketsCollected: number;
  enemiesKilled: number;
  bossesKilled: number;
  chestsOpened: number;
  trapsTriggered: number;
  upgradesTaken: UpgradeId[];
}
