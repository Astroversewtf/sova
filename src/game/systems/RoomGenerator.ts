import {
  CellType,
  EnemyType,
  TreasureType,
  TrapType,
  type FloorMap,
  type TilePos,
  type EnemySpawnData,
  type TreasureSpawnData,
  type TrapSpawnData,
} from "../types";
import {
  getFloorSize,
  getEnemyCount,
  getTreasureCount,
  TREASURE_WEIGHTS,
  TREASURE_VALUES,
  BOSS_MIN_FLOOR,
  BOSS_CHANCE,
  SPAWN_SAFE_RADIUS,
  MIN_STAIRS_DISTANCE_RATIO,
} from "../constants";

// ── Helpers ──

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function dist(a: TilePos, b: TilePos): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function manhattan(a: TilePos, b: TilePos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Room type ──

interface Room {
  x: number; // top-left grid x
  y: number; // top-left grid y
  w: number; // width in tiles
  h: number; // height in tiles
  cx: number; // center x
  cy: number; // center y
}

// ── Room-and-corridor dungeon generator ──
//
// Matches Maze of Gains style:
//   - Rectangular open rooms (3×3 to 7×6)
//   - 1-tile-wide L-shaped corridors connecting them
//   - Mix of open spaces and tight passages
//   - Dead-end rooms with treasure
//   - Boss chamber (larger room) on boss floors
//
// Algorithm:
//   1. Place N non-overlapping rooms (with 1-tile padding)
//   2. Build minimum spanning tree over room centres → guarantees connectivity
//   3. Add ~25% extra edges for alternative paths / loops
//   4. Carve L-shaped corridors along each edge
//   5. Place spawn in leftmost room, stairs in rightmost

function getRoomCount(floor: number): number {
  if (floor <= 3) return randInt(4, 6);
  if (floor <= 6) return randInt(6, 9);
  if (floor <= 9) return randInt(8, 11);
  return randInt(10, 13);
}

function getRoomSize(floor: number, small?: boolean): { rw: number; rh: number } {
  // On small maps or when forced, use smaller rooms to fit more
  if (small) {
    return { rw: randInt(3, 4), rh: randInt(3, 4) };
  }
  // Mix of small, medium, large rooms
  const roll = Math.random();
  if (roll < 0.3) {
    return { rw: randInt(3, 4), rh: randInt(3, 4) };
  } else if (roll < 0.75) {
    return { rw: randInt(4, 6), rh: randInt(4, 5) };
  } else {
    const base = floor >= 5 ? 5 : 4;
    return { rw: randInt(base, 7), rh: randInt(base, 6) };
  }
}

/** Minimum rooms to guarantee interesting layouts */
const MIN_ROOMS = 4;

/** Try to place rooms without overlap. Retries with smaller rooms if needed. */
function placeRooms(w: number, h: number, floor: number): Room[] {
  // Try up to 5 times — each retry uses smaller rooms
  for (let retry = 0; retry < 5; retry++) {
    const forceSmall = retry >= 2; // After 2 failures, force small rooms
    const rooms = tryPlaceRooms(w, h, floor, forceSmall);
    if (rooms.length >= MIN_ROOMS) return rooms;
  }
  // Last resort — guaranteed to return at least something
  return tryPlaceRooms(w, h, floor, true);
}

function tryPlaceRooms(w: number, h: number, floor: number, forceSmall: boolean): Room[] {
  const target = getRoomCount(floor);
  const rooms: Room[] = [];
  const padding = 2;

  for (let i = 0; i < target; i++) {
    let placed = false;

    for (let attempt = 0; attempt < 120; attempt++) {
      const { rw, rh } = getRoomSize(floor, forceSmall);
      // Keep 2-tile border around entire map
      const maxX = w - rw - 2;
      const maxY = h - rh - 2;
      if (maxX < 2 || maxY < 2) continue;
      const rx = randInt(2, maxX);
      const ry = randInt(2, maxY);

      // Check overlap with existing rooms (including padding)
      let overlaps = false;
      for (const other of rooms) {
        if (
          rx - padding < other.x + other.w &&
          rx + rw + padding > other.x &&
          ry - padding < other.y + other.h &&
          ry + rh + padding > other.y
        ) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        rooms.push({
          x: rx,
          y: ry,
          w: rw,
          h: rh,
          cx: Math.floor(rx + rw / 2),
          cy: Math.floor(ry + rh / 2),
        });
        placed = true;
        break;
      }
    }

    if (!placed && rooms.length >= MIN_ROOMS) break;
  }

  return rooms;
}

/** Carve a room's floor tiles into the grid */
function carveRoom(cells: CellType[][], room: Room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      cells[y][x] = CellType.FLOOR;
    }
  }
}

/** Carve an L-shaped corridor between two points (1 tile wide) */
function carveCorridor(cells: CellType[][], a: TilePos, b: TilePos) {
  let x = a.x;
  let y = a.y;

  // Randomly choose horizontal-first or vertical-first
  if (Math.random() < 0.5) {
    // Horizontal then vertical
    while (x !== b.x) {
      if (y >= 0 && y < cells.length && x >= 0 && x < cells[0].length) {
        cells[y][x] = CellType.FLOOR;
      }
      x += x < b.x ? 1 : -1;
    }
    while (y !== b.y) {
      if (y >= 0 && y < cells.length && x >= 0 && x < cells[0].length) {
        cells[y][x] = CellType.FLOOR;
      }
      y += y < b.y ? 1 : -1;
    }
  } else {
    // Vertical then horizontal
    while (y !== b.y) {
      if (y >= 0 && y < cells.length && x >= 0 && x < cells[0].length) {
        cells[y][x] = CellType.FLOOR;
      }
      y += y < b.y ? 1 : -1;
    }
    while (x !== b.x) {
      if (y >= 0 && y < cells.length && x >= 0 && x < cells[0].length) {
        cells[y][x] = CellType.FLOOR;
      }
      x += x < b.x ? 1 : -1;
    }
  }
  // Carve destination tile
  if (b.y >= 0 && b.y < cells.length && b.x >= 0 && b.x < cells[0].length) {
    cells[b.y][b.x] = CellType.FLOOR;
  }
}

/**
 * Build MST (Prim's) over rooms, then add extra edges for loops.
 * Returns list of [roomIndexA, roomIndexB] pairs to connect.
 */
function buildConnections(rooms: Room[], extraRatio: number): [number, number][] {
  const n = rooms.length;
  if (n <= 1) return [];

  // Distance matrix
  const distMatrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = manhattan(
        { x: rooms[i].cx, y: rooms[i].cy },
        { x: rooms[j].cx, y: rooms[j].cy },
      );
      distMatrix[i][j] = d;
      distMatrix[j][i] = d;
    }
  }

  // Prim's MST
  const inMST = new Set<number>();
  const mstEdges: [number, number][] = [];
  inMST.add(0);

  while (inMST.size < n) {
    let bestDist = Infinity;
    let bestFrom = -1;
    let bestTo = -1;

    for (const from of inMST) {
      for (let to = 0; to < n; to++) {
        if (inMST.has(to)) continue;
        if (distMatrix[from][to] < bestDist) {
          bestDist = distMatrix[from][to];
          bestFrom = from;
          bestTo = to;
        }
      }
    }

    if (bestTo === -1) break;
    inMST.add(bestTo);
    mstEdges.push([bestFrom, bestTo]);
  }

  // Collect non-MST edges, sorted by distance
  const mstSet = new Set(mstEdges.map(([a, b]) => `${Math.min(a, b)},${Math.max(a, b)}`));
  const extraEdges: { a: number; b: number; d: number }[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const key = `${i},${j}`;
      if (!mstSet.has(key)) {
        extraEdges.push({ a: i, b: j, d: distMatrix[i][j] });
      }
    }
  }
  extraEdges.sort((a, b) => a.d - b.d);

  // Add shortest extra edges for loops
  const extraCount = Math.max(1, Math.floor(mstEdges.length * extraRatio));
  for (let i = 0; i < extraCount && i < extraEdges.length; i++) {
    mstEdges.push([extraEdges[i].a, extraEdges[i].b]);
  }

  return mstEdges;
}

/**
 * Eliminate 1-tile-thick walls.
 * Any void tile with floor on BOTH opposite sides (N+S or E+W) gets
 * converted to floor so the wall is never just 1 block.
 * Runs multiple passes until stable.
 */
function thickenWalls(cells: CellType[][], w: number, h: number) {
  let changed = true;
  while (changed) {
    changed = false;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (cells[y][x] !== CellType.VOID) continue;
        const fN = cells[y - 1][x] === CellType.FLOOR;
        const fS = cells[y + 1][x] === CellType.FLOOR;
        const fW = cells[y][x - 1] === CellType.FLOOR;
        const fE = cells[y][x + 1] === CellType.FLOOR;
        // Floor on opposite sides → thin wall → merge
        if ((fN && fS) || (fW && fE)) {
          cells[y][x] = CellType.FLOOR;
          changed = true;
        }
      }
    }
  }
}

// ── Floor generation (public API) ──

export function generateFloor(floor: number): FloorMap {
  const { w, h } = getFloorSize(floor);

  const cells: CellType[][] = Array.from({ length: h }, () =>
    Array<CellType>(w).fill(CellType.VOID),
  );

  // 1. Place rooms
  const rooms = placeRooms(w, h, floor);

  // 2. Carve rooms
  for (const room of rooms) {
    carveRoom(cells, room);
  }

  // 3. Connect rooms (MST + extra loops)
  const extraLoops = floor <= 3 ? 0.2 : floor <= 6 ? 0.3 : 0.35;
  const connections = buildConnections(rooms, extraLoops);
  for (const [ai, bi] of connections) {
    carveCorridor(
      cells,
      { x: rooms[ai].cx, y: rooms[ai].cy },
      { x: rooms[bi].cx, y: rooms[bi].cy },
    );
  }

  // 3b. Thicken thin walls — any void with floor on opposite sides becomes floor
  thickenWalls(cells, w, h);

  // 4. Sort rooms left-to-right for spawn/stairs placement
  const sorted = [...rooms].sort((a, b) => a.cx - b.cx);
  const spawnRoom = sorted[0];
  const stairsRoom = sorted[sorted.length - 1];

  const spawn: TilePos = { x: spawnRoom.cx, y: spawnRoom.cy };
  const stairs: TilePos = { x: stairsRoom.cx, y: stairsRoom.cy };

  // 5. Boss check
  const isBossFloor =
    floor >= BOSS_MIN_FLOOR && Math.random() < BOSS_CHANCE;
  let bossSpawn: TilePos | null = null;
  let statuePos: TilePos | null = null;

  if (isBossFloor && rooms.length >= 3) {
    // Pick a central room for boss — not spawn or stairs room
    const candidates = rooms.filter(
      (r) => r !== spawnRoom && r !== stairsRoom,
    );
    // Pick the one closest to map centre
    const mapCx = Math.floor(w / 2);
    const mapCy = Math.floor(h / 2);
    candidates.sort(
      (a, b) =>
        dist({ x: a.cx, y: a.cy }, { x: mapCx, y: mapCy }) -
        dist({ x: b.cx, y: b.cy }, { x: mapCx, y: mapCy }),
    );
    const bossRoom = candidates[0];

    // Expand boss room to at least 5×5
    const expandX = Math.max(0, 5 - bossRoom.w);
    const expandY = Math.max(0, 5 - bossRoom.h);
    const ex = Math.floor(expandX / 2);
    const ey = Math.floor(expandY / 2);
    for (let dy = -ey; dy < bossRoom.h + ey + (expandY % 2); dy++) {
      for (let dx = -ex; dx < bossRoom.w + ex + (expandX % 2); dx++) {
        const nx = bossRoom.x + dx;
        const ny = bossRoom.y + dy;
        if (nx >= 1 && nx < w - 1 && ny >= 1 && ny < h - 1) {
          cells[ny][nx] = CellType.FLOOR;
        }
      }
    }

    bossSpawn = { x: bossRoom.cx, y: bossRoom.cy };

    // Statue in a different room
    const statueRoom = candidates.length > 1 ? candidates[candidates.length - 1] : null;
    if (statueRoom) {
      statuePos = { x: statueRoom.cx, y: statueRoom.cy };
    }
  }

  // 6. Enemies
  const enemySpawns = placeEnemies(
    cells, spawn, stairs, floor, isBossFloor, bossSpawn, w, h,
  );

  // 7. Treasure
  const occupied = new Set<string>();
  occupied.add(`${spawn.x},${spawn.y}`);
  occupied.add(`${stairs.x},${stairs.y}`);
  for (const e of enemySpawns) occupied.add(`${e.pos.x},${e.pos.y}`);
  if (bossSpawn) occupied.add(`${bossSpawn.x},${bossSpawn.y}`);
  if (statuePos) occupied.add(`${statuePos.x},${statuePos.y}`);

  // No random floor treasure — loot only from chests and enemies
  const treasureSpawns: TreasureSpawnData[] = [];

  // 8. Chests (1-3 per floor, placed inside rooms away from spawn)
  const chestSpawns = placeChests(cells, occupied, rooms, spawnRoom, w, h, floor);
  for (const c of chestSpawns) occupied.add(`${c.x},${c.y}`);

  // 9. Traps (2-5 per floor, placed in corridors and room edges)
  const trapSpawns = placeTraps(cells, occupied, rooms, w, h, floor);

  return {
    width: w,
    height: h,
    cells,
    spawn,
    stairs,
    enemySpawns,
    treasureSpawns,
    chestSpawns,
    trapSpawns,
    bossSpawn,
    statuePos,
  };
}

// ── Placement helpers ──

function getAllFloorTiles(
  cells: CellType[][],
  w: number,
  h: number,
): TilePos[] {
  const tiles: TilePos[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (cells[y][x] === CellType.FLOOR) tiles.push({ x, y });
    }
  }
  return tiles;
}

function placeEnemies(
  cells: CellType[][],
  spawn: TilePos,
  stairs: TilePos,
  floor: number,
  isBossFloor: boolean,
  bossSpawn: TilePos | null,
  w: number,
  h: number,
): EnemySpawnData[] {
  if (isBossFloor && bossSpawn) {
    return [{ pos: bossSpawn, type: EnemyType.BOSS }];
  }

  const { basic, tanky } = getEnemyCount(floor);
  const candidates = shuffle(
    getAllFloorTiles(cells, w, h).filter(
      (t) =>
        manhattan(t, spawn) > SPAWN_SAFE_RADIUS &&
        !(t.x === stairs.x && t.y === stairs.y),
    ),
  );

  const enemies: EnemySpawnData[] = [];
  let idx = 0;
  for (let i = 0; i < basic && idx < candidates.length; i++, idx++) {
    enemies.push({ pos: candidates[idx], type: EnemyType.BASIC });
  }
  for (let i = 0; i < tanky && idx < candidates.length; i++, idx++) {
    enemies.push({ pos: candidates[idx], type: EnemyType.TANKY });
  }
  return enemies;
}

function placeTreasure(
  cells: CellType[][],
  occupied: Set<string>,
  floor: number,
  w: number,
  h: number,
): TreasureSpawnData[] {
  const count = getTreasureCount(floor);
  const available = shuffle(
    getAllFloorTiles(cells, w, h).filter(
      (t) => !occupied.has(`${t.x},${t.y}`),
    ),
  );

  const treasures: TreasureSpawnData[] = [];
  for (let i = 0; i < count && i < available.length; i++) {
    const roll = Math.random();
    let type: TreasureType;
    if (roll < TREASURE_WEIGHTS[TreasureType.COIN]) {
      type = TreasureType.COIN;
    } else if (
      roll <
      TREASURE_WEIGHTS[TreasureType.COIN] + TREASURE_WEIGHTS[TreasureType.GEM]
    ) {
      type = TreasureType.GEM;
    } else {
      type = TreasureType.GOLDEN_TICKET;
    }
    treasures.push({ pos: available[i], type, value: TREASURE_VALUES[type] });
  }
  return treasures;
}

function getChestCount(floor: number): number {
  if (floor <= 3) return randInt(1, 2);
  if (floor <= 6) return randInt(1, 3);
  return randInt(2, 3);
}

function placeChests(
  cells: CellType[][],
  occupied: Set<string>,
  rooms: Room[],
  spawnRoom: Room,
  w: number,
  h: number,
  floor: number,
): TilePos[] {
  const count = getChestCount(floor);
  // Prefer tiles inside rooms (not corridors), away from spawn room
  const candidates: TilePos[] = [];
  for (const room of rooms) {
    if (room === spawnRoom) continue;
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (cells[y][x] === CellType.FLOOR && !occupied.has(`${x},${y}`)) {
          candidates.push({ x, y });
        }
      }
    }
  }
  shuffle(candidates);
  return candidates.slice(0, count);
}

function getTrapCount(floor: number): number {
  if (floor <= 2) return randInt(2, 3);
  if (floor <= 5) return randInt(3, 4);
  return randInt(3, 5);
}

/** Check if a tile is in a corridor (floor tile with <=2 open neighbours in cardinal dirs) */
function isCorridorTile(cells: CellType[][], x: number, y: number, w: number, h: number): boolean {
  let openCount = 0;
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < w && ny < h && cells[ny][nx] === CellType.FLOOR) {
      openCount++;
    }
  }
  return openCount <= 2;
}

/** Check if tile is on the edge of a room (adjacent to void on at least one side) */
function isRoomEdge(cells: CellType[][], x: number, y: number, w: number, h: number): boolean {
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h || cells[ny][nx] === CellType.VOID) {
      return true;
    }
  }
  return false;
}

function placeTraps(
  cells: CellType[][],
  occupied: Set<string>,
  rooms: Room[],
  w: number,
  h: number,
  floor: number,
): TrapSpawnData[] {
  const count = getTrapCount(floor);
  // Traps go in corridors and room edges
  const candidates: TilePos[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (cells[y][x] !== CellType.FLOOR) continue;
      if (occupied.has(`${x},${y}`)) continue;
      if (isCorridorTile(cells, x, y, w, h) || isRoomEdge(cells, x, y, w, h)) {
        candidates.push({ x, y });
      }
    }
  }
  shuffle(candidates);

  const traps: TrapSpawnData[] = [];
  for (let i = 0; i < count && i < candidates.length; i++) {
    const type = Math.random() < 0.6 ? TrapType.SPIKE : TrapType.POISON;
    traps.push({ pos: candidates[i], type });
  }
  return traps;
}
