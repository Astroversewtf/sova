/** Shared types for the SOVA game engine */

export interface TilePos {
  x: number;
  y: number;
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
  GOLEM = "golem",
  GHOST = "ghost",
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

export type UpgradeId =
  | "sharp_blade"
  | "vitality_surge"
  | "life_steal"
  | "thick_skin"
  | "swift_feet"
  | "second_wind";

export type UpgradeRarity = "common" | "rare" | "epic";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  stackable: boolean;
  rarity: UpgradeRarity;
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
