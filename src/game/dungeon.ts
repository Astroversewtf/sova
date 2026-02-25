/**
 * Room-based dungeon generator.
 *
 * Generates large open rooms of varying sizes connected by narrow corridors.
 * Uses BSP (Binary Space Partitioning) for room placement, then connects
 * rooms with 1-2 tile wide passages.
 *
 * Grid cell types:
 *   0 = wall
 *   1 = floor
 *   2 = corridor floor
 */

export interface DungeonConfig {
  width: number;
  height: number;
  minRoomSize: number;
  maxRoomSize: number;
  maxRooms: number;
  /** Current floor number — difficulty scaling */
  floor: number;
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  centerX: number;
  centerY: number;
}

export type CellType = 0 | 1 | 2; // wall | room floor | corridor

export interface SpawnPoint {
  x: number;
  y: number;
}

export interface DungeonObject {
  x: number;
  y: number;
  type: "chest" | "crate" | "potion_red" | "potion_blue" | "coin" | "heart" | "lightning" | "bag";
}

export interface EnemySpawn {
  x: number;
  y: number;
  type: "slime" | "ghost";
}

export interface DungeonData {
  grid: CellType[][];
  width: number;
  height: number;
  rooms: Room[];
  start: SpawnPoint;
  exit: SpawnPoint;
  objects: DungeonObject[];
  enemies: EnemySpawn[];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateDungeon(config: DungeonConfig): DungeonData {
  const { width, height, minRoomSize, maxRoomSize, maxRooms, floor } = config;

  // Initialize grid with walls
  const grid: CellType[][] = Array.from({ length: height }, () =>
    Array<CellType>(width).fill(0)
  );

  const rooms: Room[] = [];

  // Try to place rooms randomly (no overlap)
  for (let attempt = 0; attempt < maxRooms * 10 && rooms.length < maxRooms; attempt++) {
    const w = randInt(minRoomSize, maxRoomSize);
    const h = randInt(minRoomSize, maxRoomSize);
    const x = randInt(1, width - w - 1);
    const y = randInt(1, height - h - 1);

    // Check overlap with padding of 1 tile
    const overlaps = rooms.some(
      (r) =>
        x - 1 < r.x + r.w &&
        x + w + 1 > r.x &&
        y - 1 < r.y + r.h &&
        y + h + 1 > r.y
    );

    if (overlaps) continue;

    rooms.push({
      x,
      y,
      w,
      h,
      centerX: Math.floor(x + w / 2),
      centerY: Math.floor(y + h / 2),
    });

    // Carve room into grid
    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) {
        grid[ry][rx] = 1;
      }
    }
  }

  // Connect rooms with corridors — connect each room to its nearest unconnected neighbor
  const connected = new Set<number>();
  connected.add(0);

  while (connected.size < rooms.length) {
    let bestDist = Infinity;
    let bestFrom = -1;
    let bestTo = -1;

    for (const fromIdx of connected) {
      for (let toIdx = 0; toIdx < rooms.length; toIdx++) {
        if (connected.has(toIdx)) continue;
        const dx = rooms[fromIdx].centerX - rooms[toIdx].centerX;
        const dy = rooms[fromIdx].centerY - rooms[toIdx].centerY;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestFrom = fromIdx;
          bestTo = toIdx;
        }
      }
    }

    if (bestTo === -1) break;

    connected.add(bestTo);
    carveCorridor(grid, rooms[bestFrom], rooms[bestTo], width, height);
  }

  // Add a few extra corridors for loops (makes exploration more interesting)
  const extraCorridors = Math.min(3, Math.floor(rooms.length / 3));
  const roomIndices = [...Array(rooms.length).keys()];
  shuffle(roomIndices);
  for (let i = 0; i < extraCorridors && i + 1 < roomIndices.length; i++) {
    carveCorridor(grid, rooms[roomIndices[i]], rooms[roomIndices[i + 1]], width, height);
  }

  // Start = center of first room, Exit = center of last room
  const start: SpawnPoint = {
    x: rooms[0].centerX,
    y: rooms[0].centerY,
  };

  // Place exit in the farthest room from start
  let farthestIdx = rooms.length - 1;
  let farthestDist = 0;
  for (let i = 1; i < rooms.length; i++) {
    const dx = rooms[i].centerX - start.x;
    const dy = rooms[i].centerY - start.y;
    const dist = dx * dx + dy * dy;
    if (dist > farthestDist) {
      farthestDist = dist;
      farthestIdx = i;
    }
  }

  const exit: SpawnPoint = {
    x: rooms[farthestIdx].centerX,
    y: rooms[farthestIdx].centerY,
  };

  // Spawn objects in rooms (skip start and exit rooms)
  const objects: DungeonObject[] = [];
  const enemies: EnemySpawn[] = [];

  const objectTypes: DungeonObject["type"][] = [
    "chest", "crate", "potion_red", "potion_blue", "coin", "heart", "lightning", "bag",
  ];

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i];
    const isStartRoom = i === 0;
    const isExitRoom = i === farthestIdx;

    // Number of objects per room scales with floor
    const numObjects = isStartRoom ? 0 : randInt(1, 2 + Math.floor(floor / 3));
    const numEnemies = isStartRoom || isExitRoom ? 0 : (Math.random() < 0.5 + floor * 0.05 ? randInt(1, Math.min(3, 1 + Math.floor(floor / 2))) : 0);

    const usedPositions = new Set<string>();
    // Reserve center of exit room for ladder
    if (isExitRoom) {
      usedPositions.add(`${exit.x},${exit.y}`);
    }

    for (let o = 0; o < numObjects; o++) {
      const pos = findEmptySpot(room, grid, usedPositions);
      if (!pos) break;
      usedPositions.add(`${pos.x},${pos.y}`);
      objects.push({
        x: pos.x,
        y: pos.y,
        type: objectTypes[randInt(0, objectTypes.length - 1)],
      });
    }

    for (let e = 0; e < numEnemies; e++) {
      const pos = findEmptySpot(room, grid, usedPositions);
      if (!pos) break;
      usedPositions.add(`${pos.x},${pos.y}`);
      enemies.push({
        x: pos.x,
        y: pos.y,
        type: Math.random() < 0.5 ? "slime" : "ghost",
      });
    }
  }

  return { grid, width, height, rooms, start, exit, objects, enemies };
}

function carveCorridor(
  grid: CellType[][],
  from: Room,
  to: Room,
  gridWidth: number,
  gridHeight: number
) {
  let x = from.centerX;
  let y = from.centerY;
  const tx = to.centerX;
  const ty = to.centerY;

  // Horizontal first, then vertical (L-shaped corridor)
  while (x !== tx) {
    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight && grid[y][x] === 0) {
      grid[y][x] = 2;
    }
    x += x < tx ? 1 : -1;
  }

  while (y !== ty) {
    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight && grid[y][x] === 0) {
      grid[y][x] = 2;
    }
    y += y < ty ? 1 : -1;
  }
}

function findEmptySpot(
  room: Room,
  grid: CellType[][],
  used: Set<string>
): SpawnPoint | null {
  for (let attempt = 0; attempt < 20; attempt++) {
    const x = randInt(room.x + 1, room.x + room.w - 2);
    const y = randInt(room.y + 1, room.y + room.h - 2);
    const key = `${x},${y}`;
    if (grid[y][x] !== 0 && !used.has(key)) {
      return { x, y };
    }
  }
  return null;
}

export const DUNGEON_DEFAULTS: DungeonConfig = {
  width: 60,
  height: 45,
  minRoomSize: 5,
  maxRoomSize: 11,
  maxRooms: 12,
  floor: 1,
};
