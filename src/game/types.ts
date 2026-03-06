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
  BASIC = "basic",
  TANKY = "tanky",
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
  POISON = "poison",
}

export interface TrapSpawnData {
  pos: TilePos;
  type: TrapType;
}

export type PropType = "rock_small" | "rock_big";

export interface PropSpawnData {
  pos: TilePos;
  type: PropType;
}

export type UpgradeId =
  | "sharp_blade"
  | "vitality_surge"
  | "life_steal"
  | "eagle_eye"
  | "thick_skin"
  | "treasure_magnet"
  | "swift_feet"
  | "second_wind";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  stackable: boolean;
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
