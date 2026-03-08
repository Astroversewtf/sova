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
  type PropSpawnData,
  type PropType,
  type WallPropSpawnData,
  type WallPropType,
} from "../types";
import {
  getFloorSize,
  getEnemySpawnConfig,
  getTreasureCount,
  TREASURE_WEIGHTS,
  TREASURE_VALUES,
  BOSS_MIN_FLOOR,
  getBossSpawnChance,
} from "../constants";

// ══════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════

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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

// ══════════════════════════════════════════════════════
// Room type
// ══════════════════════════════════════════════════════

interface Room {
  x: number;  // top-left grid x
  y: number;  // top-left grid y
  w: number;  // width in tiles
  h: number;  // height in tiles
  cx: number; // center x
  cy: number; // center y
}

// ══════════════════════════════════════════════════════
// R8/R9 — Room count per floor
// ══════════════════════════════════════════════════════

function getRoomCount(floor: number): number {
  if (floor <= 4) return randInt(5, 6);
  if (floor <= 6) return randInt(6, 7);
  if (floor === 7) return randInt(7, 8);
  if (floor === 8) return randInt(8, 9);
  return Math.min(10, 9 + (floor - 8));
}

// ══════════════════════════════════════════════════════
// R3 — Max room dimensions per tier
// ══════════════════════════════════════════════════════

function getMaxSecondary(floor: number): number {
  if (floor <= 2) return 7;
  if (floor <= 4) return 6;
  if (floor <= 6) return 5;
  if (floor <= 8) return 4;
  return 3;
}

// ══════════════════════════════════════════════════════
// R1-R6 — Room size generation
// ══════════════════════════════════════════════════════

interface SizeSpec { w: number; h: number }

function sizeKey(s: SizeSpec): string {
  return `${s.w},${s.h}`;
}

function buildSizePool(floor: number): SizeSpec[] {
  const maxSec = getMaxSecondary(floor);
  const allow3x3 = floor >= 4;
  const seen = new Set<string>();
  const pool: SizeSpec[] = [];

  for (let w = 3; w <= 7; w++) {
    for (let h = 3; h <= maxSec; h++) {
      if (w === 3 && h === 3 && !allow3x3) continue;
      const k = sizeKey({ w, h });
      if (!seen.has(k)) {
        seen.add(k);
        pool.push({ w, h });
      }
      // Rotation (swap w/h) if different and valid
      if (w !== h && h <= 7 && w <= maxSec) {
        const rk = sizeKey({ w: h, h: w });
        if (!seen.has(rk)) {
          seen.add(rk);
          pool.push({ w: h, h: w });
        }
      }
    }
  }
  return pool;
}

function generateRoomSizes(floor: number, count: number): SizeSpec[] {
  const pool = buildSizePool(floor);
  const squares = pool.filter(s => s.w === s.h);
  const rects = pool.filter(s => s.w !== s.h);

  // Phase 1: seed with 4 distinct sizes (R5), mix of square + rect (R6)
  const sqCount = Math.min(2, squares.length, Math.max(1, squares.length));
  const rcCount = Math.min(4 - sqCount, rects.length);
  const seeds: SizeSpec[] = [
    ...shuffle([...squares]).slice(0, sqCount),
    ...shuffle([...rects]).slice(0, rcCount),
  ];
  // If we couldn't get 4 from sq+rect, fill from the full pool
  if (seeds.length < 4) {
    const seedKeys = new Set(seeds.map(sizeKey));
    for (const s of shuffle([...pool])) {
      if (seeds.length >= 4) break;
      if (!seedKeys.has(sizeKey(s))) {
        seeds.push(s);
        seedKeys.add(sizeKey(s));
      }
    }
  }

  const result = [...seeds];
  let count3x3 = result.filter(s => s.w === 3 && s.h === 3).length;
  const countMap = new Map<string, number>();
  for (const s of result) {
    const k = sizeKey(s);
    countMap.set(k, (countMap.get(k) ?? 0) + 1);
  }

  // Phase 2: fill remaining slots
  const shuffledPool = shuffle([...pool]);
  let poolIdx = 0;
  while (result.length < count) {
    const candidate = shuffledPool[poolIdx % shuffledPool.length];
    poolIdx++;

    // R1: max 2 of 3x3
    if (candidate.w === 3 && candidate.h === 3 && count3x3 >= 2) continue;

    // Limit any single size to 3 occurrences (helps R4 later)
    const k = sizeKey(candidate);
    if ((countMap.get(k) ?? 0) >= 3) continue;

    result.push(candidate);
    countMap.set(k, (countMap.get(k) ?? 0) + 1);
    if (candidate.w === 3 && candidate.h === 3) count3x3++;

    // Reset pool index after a full cycle to avoid infinite loops
    if (poolIdx > pool.length * count) {
      // Relax constraints: allow up to 4 of the same size
      for (const s of shuffle([...pool])) {
        if (result.length >= count) break;
        result.push(s);
      }
    }
  }

  return shuffle(result);
}

// ══════════════════════════════════════════════════════
// Organic room placement — rooms exactly 2 tiles apart
// ══════════════════════════════════════════════════════

type Direction = "right" | "left" | "down" | "up";

interface Connection {
  a: number;
  b: number;
  dir: Direction;
}

/** Exactly 2 tiles between connected rooms (the passage fills this gap) */
const PASSAGE_GAP = 2;

/** Minimum gap between any two rooms (prevents merging and visual artifacts) */
const MIN_ROOM_GAP = 2;

/** Minimum perpendicular overlap to guarantee non-corner passage carving. */
const MIN_PASSAGE_OVERLAP = 3;

function makeRoom(x: number, y: number, w: number, h: number): Room {
  return { x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) };
}

/**
 * Check if a candidate room at (rx,ry,rw,rh) is too close to any existing room.
 * Returns true if ANY room is closer than MIN_ROOM_GAP on BOTH axes simultaneously.
 */
function roomCollides(
  rx: number, ry: number, rw: number, rh: number,
  rooms: Room[],
): boolean {
  for (const room of rooms) {
    const gapH = Math.max(rx - (room.x + room.w), room.x - (rx + rw));
    const gapV = Math.max(ry - (room.y + room.h), room.y - (ry + rh));
    if (gapH < MIN_ROOM_GAP && gapV < MIN_ROOM_GAP) return true;
  }
  return false;
}

/**
 * Try to place a room of size (cw,ch) exactly PASSAGE_GAP tiles from parent
 * in the given direction. Tries all valid perpendicular positions.
 */
function tryPlaceRoom(
  parent: Room, cw: number, ch: number, dir: Direction,
  rooms: Room[], border: number, gridW: number, gridH: number,
): Room | null {
  if (dir === "right" || dir === "left") {
    const rx = dir === "right"
      ? parent.x + parent.w + PASSAGE_GAP
      : parent.x - PASSAGE_GAP - cw;

    if (rx < border || rx + cw > gridW - border) return null;

    // Valid Y range: require enough overlap to carve passage away from corners.
    const yMin = Math.max(border, parent.y - ch + MIN_PASSAGE_OVERLAP);
    const yMax = Math.min(gridH - border - ch, parent.y + parent.h - MIN_PASSAGE_OVERLAP);
    if (yMin > yMax) return null;

    const ys: number[] = [];
    for (let y = yMin; y <= yMax; y++) ys.push(y);
    shuffle(ys);

    for (const ry of ys) {
      if (!roomCollides(rx, ry, cw, ch, rooms)) {
        return makeRoom(rx, ry, cw, ch);
      }
    }
  } else {
    const ry = dir === "down"
      ? parent.y + parent.h + PASSAGE_GAP
      : parent.y - PASSAGE_GAP - ch;

    if (ry < border || ry + ch > gridH - border) return null;

    // Valid X range: require enough overlap to carve passage away from corners.
    const xMin = Math.max(border, parent.x - cw + MIN_PASSAGE_OVERLAP);
    const xMax = Math.min(gridW - border - cw, parent.x + parent.w - MIN_PASSAGE_OVERLAP);
    if (xMin > xMax) return null;

    const xs: number[] = [];
    for (let x = xMin; x <= xMax; x++) xs.push(x);
    shuffle(xs);

    for (const rx of xs) {
      if (!roomCollides(rx, ry, cw, ch, rooms)) {
        return makeRoom(rx, ry, cw, ch);
      }
    }
  }

  return null;
}

/**
 * Place rooms organically: each room is placed exactly PASSAGE_GAP tiles
 * from a parent room, guaranteeing straight 2-tile passages.
 * R2 is enforced during placement (no 3x3 parent for 3x3 room).
 */
function placeRoomsDirect(
  gridW: number, gridH: number, sizes: SizeSpec[],
): { rooms: Room[]; connections: Connection[] } {
  const border = 1;
  const rooms: Room[] = [];
  const connections: Connection[] = [];

  // Place first room near center
  const s0 = sizes[0];
  const x0 = clamp(
    Math.floor((gridW - s0.w) / 2) + randInt(-2, 2),
    border, gridW - border - s0.w,
  );
  const y0 = clamp(
    Math.floor((gridH - s0.h) / 2) + randInt(-2, 2),
    border, gridH - border - s0.h,
  );
  rooms.push(makeRoom(x0, y0, s0.w, s0.h));

  for (let i = 1; i < sizes.length; i++) {
    const { w: rw, h: rh } = sizes[i];
    let placed = false;

    // Count children per room — prefer parents with fewer children (branching layout)
    const childCount = new Array(rooms.length).fill(0);
    for (const c of connections) childCount[c.a]++;

    const parentOrder = shuffle([...Array(rooms.length).keys()])
      .sort((a: number, b: number) => childCount[a] - childCount[b]);

    for (const pi of parentOrder) {
      if (placed) break;
      const parent = rooms[pi];

      // R2: skip 3×3 parents for 3×3 rooms
      if (rw === 3 && rh === 3 && parent.w === 3 && parent.h === 3) continue;

      const dirs = shuffle<Direction>(["right", "left", "down", "up"]);

      for (const dir of dirs) {
        // Try original orientation
        const room = tryPlaceRoom(parent, rw, rh, dir, rooms, border, gridW, gridH);
        if (room) {
          rooms.push(room);
          connections.push({ a: pi, b: rooms.length - 1, dir });
          placed = true;
          break;
        }
        // Try rotated (swap w/h) if non-square
        if (rw !== rh) {
          const rotRoom = tryPlaceRoom(parent, rh, rw, dir, rooms, border, gridW, gridH);
          if (rotRoom) {
            rooms.push(rotRoom);
            connections.push({ a: pi, b: rooms.length - 1, dir });
            placed = true;
            break;
          }
        }
      }
    }
    // If not placed, dungeon has fewer rooms (acceptable)
  }

  return { rooms, connections };
}

// ══════════════════════════════════════════════════════
// Extra connections (loops between rooms that are exactly 2 tiles apart)
// ══════════════════════════════════════════════════════

function findExtraConnections(rooms: Room[], existing: Connection[]): Connection[] {
  const edgeSet = new Set<string>();
  for (const c of existing) {
    edgeSet.add(`${Math.min(c.a, c.b)},${Math.max(c.a, c.b)}`);
  }

  const extras: Connection[] = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (edgeSet.has(`${i},${j}`)) continue;
      const a = rooms[i], b = rooms[j];

      // R2: skip 3×3 ↔ 3×3 connections
      if (a.w === 3 && a.h === 3 && b.w === 3 && b.h === 3) continue;

      // Horizontal adjacency: exactly 2 tiles apart with enough Y overlap
      const gapR = b.x - (a.x + a.w);
      const gapL = a.x - (b.x + b.w);
      const yTop = Math.max(a.y, b.y);
      const yBot = Math.min(a.y + a.h, b.y + b.h);
      const yOverlap = yBot - yTop;

      if (gapR === PASSAGE_GAP && yOverlap >= MIN_PASSAGE_OVERLAP) {
        extras.push({ a: i, b: j, dir: "right" });
        continue;
      }
      if (gapL === PASSAGE_GAP && yOverlap >= MIN_PASSAGE_OVERLAP) {
        extras.push({ a: i, b: j, dir: "left" });
        continue;
      }

      // Vertical adjacency: exactly 2 tiles apart with enough X overlap
      const gapD = b.y - (a.y + a.h);
      const gapU = a.y - (b.y + b.h);
      const xLeft = Math.max(a.x, b.x);
      const xRight = Math.min(a.x + a.w, b.x + b.w);
      const xOverlap = xRight - xLeft;

      if (gapD === PASSAGE_GAP && xOverlap >= MIN_PASSAGE_OVERLAP) {
        extras.push({ a: i, b: j, dir: "down" });
        continue;
      }
      if (gapU === PASSAGE_GAP && xOverlap >= MIN_PASSAGE_OVERLAP) {
        extras.push({ a: i, b: j, dir: "up" });
        continue;
      }
    }
  }
  return extras;
}

// ══════════════════════════════════════════════════════
// Graph helpers
// ══════════════════════════════════════════════════════

function buildAdjList(n: number, edges: [number, number][]): number[][] {
  const adj: number[][] = Array.from({ length: n }, () => []);
  for (const [a, b] of edges) {
    adj[a].push(b);
    adj[b].push(a);
  }
  return adj;
}

function bfsAll(adj: number[][], start: number): Set<number> {
  const visited = new Set<number>();
  const queue = [start];
  visited.add(start);
  while (queue.length > 0) {
    const node = queue.shift()!;
    for (const nb of adj[node]) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }
  return visited;
}

function bfsFarthest(adj: number[][], start: number): number {
  const visited = new Set<number>();
  const queue: [number, number][] = [[start, 0]];
  visited.add(start);
  let farthest = start;
  let maxDist = 0;

  while (queue.length > 0) {
    const [node, d] = queue.shift()!;
    if (d > maxDist) {
      maxDist = d;
      farthest = node;
    }
    for (const nb of adj[node]) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push([nb, d + 1]);
      }
    }
  }
  return farthest;
}

// ══════════════════════════════════════════════════════
// Room carving & exact passage carving (R7)
// ══════════════════════════════════════════════════════

function carveRoom(cells: CellType[][], room: Room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (y >= 0 && y < cells.length && x >= 0 && x < cells[0].length) {
        cells[y][x] = CellType.FLOOR;
      }
    }
  }
}

function setFloor(cells: CellType[][], x: number, y: number, gw: number, gh: number) {
  if (x >= 0 && x < gw && y >= 0 && y < gh) cells[y][x] = CellType.FLOOR;
}

/**
 * R7 — Carve an EXACT 1-wide × 2-deep passage between two rooms.
 *
 * Rooms are guaranteed to be exactly PASSAGE_GAP (2) tiles apart on
 * the connection axis, with perpendicular overlap. The passage fills
 * that 2-tile gap at a random shared row/column.
 *
 * Visual (horizontal):
 *   ███░███
 *   ███░███   (1 wide, 2 deep)
 */
/**
 * Pick a passage coordinate avoiding corners of both rooms.
 * Safe range is [max(aStart+1, bStart+1) .. min(aEnd-2, bEnd-2)].
 * Returns null when safe range is empty (caller should skip that connection).
 */
function safePassageCoord(
  aStart: number, aLen: number,
  bStart: number, bLen: number,
): number | null {
  const rawMin = Math.max(aStart, bStart);
  const rawMax = Math.min(aStart + aLen, bStart + bLen) - 1;
  if (rawMax < rawMin) return null; // no overlap at all

  // Inset by 1 from each room's edge to avoid corners
  const safeMin = Math.max(aStart + 1, bStart + 1);
  const safeMax = Math.min(aStart + aLen - 2, bStart + bLen - 2);

  if (safeMin <= safeMax) return randInt(safeMin, safeMax);
  // Overlap too small for safe range — reject to avoid corner passage.
  return null;
}

function carveExactPassage(
  cells: CellType[][],
  roomA: Room, roomB: Room,
  dir: Direction,
  gw: number, gh: number,
): void {
  switch (dir) {
    case "right": {
      const gx1 = roomA.x + roomA.w;
      const gx2 = gx1 + 1;
      const passY = safePassageCoord(roomA.y, roomA.h, roomB.y, roomB.h);
      if (passY === null) return;
      setFloor(cells, gx1, passY, gw, gh);
      setFloor(cells, gx2, passY, gw, gh);
      break;
    }
    case "left": {
      const gx1 = roomB.x + roomB.w;
      const gx2 = gx1 + 1;
      const passY = safePassageCoord(roomA.y, roomA.h, roomB.y, roomB.h);
      if (passY === null) return;
      setFloor(cells, gx1, passY, gw, gh);
      setFloor(cells, gx2, passY, gw, gh);
      break;
    }
    case "down": {
      const gy1 = roomA.y + roomA.h;
      const gy2 = gy1 + 1;
      const passX = safePassageCoord(roomA.x, roomA.w, roomB.x, roomB.w);
      if (passX === null) return;
      setFloor(cells, passX, gy1, gw, gh);
      setFloor(cells, passX, gy2, gw, gh);
      break;
    }
    case "up": {
      const gy1 = roomB.y + roomB.h;
      const gy2 = gy1 + 1;
      const passX = safePassageCoord(roomA.x, roomA.w, roomB.x, roomB.w);
      if (passX === null) return;
      setFloor(cells, passX, gy1, gw, gh);
      setFloor(cells, passX, gy2, gw, gh);
      break;
    }
  }
}

// ══════════════════════════════════════════════════════
// PUBLIC API — generateFloor
// ══════════════════════════════════════════════════════

export function generateFloor(floor: number, hasKilledBossThisRun = false): FloorMap {
  const { w, h } = getFloorSize(floor);

  // 1. Initialize grid
  const cells: CellType[][] = Array.from({ length: h }, () =>
    Array<CellType>(w).fill(CellType.VOID),
  );

  // 2. Generate room sizes (R1-R6) and count (R8/R9)
  const count = getRoomCount(floor);
  const sizes = generateRoomSizes(floor, count);

  // 3. Place rooms organically with exact 2-tile gaps
  let placement = placeRoomsDirect(w, h, sizes);
  // Retry if too few rooms placed
  for (let retry = 0; retry < 5 && placement.rooms.length < Math.max(3, Math.floor(count * 0.7)); retry++) {
    placement = placeRoomsDirect(w, h, generateRoomSizes(floor, count));
  }
  const { rooms } = placement;
  const allConnections = [...placement.connections];

  // 4. Add extra connections for loops (rooms that happen to be exactly 2 tiles apart)
  const extras = findExtraConnections(rooms, allConnections);
  const extraCount = Math.min(
    Math.floor(allConnections.length * 0.25),
    extras.length,
  );
  for (const extra of shuffle(extras).slice(0, extraCount)) {
    allConnections.push(extra);
  }

  // 5. Carve rooms
  for (const room of rooms) {
    carveRoom(cells, room);
  }

  // 6. Carve exact 1×2 passages (R7)
  for (const conn of allConnections) {
    carveExactPassage(cells, rooms[conn.a], rooms[conn.b], conn.dir, w, h);
  }

  // NO thickenWalls — passages must stay exactly 1×2

  // 7. Spawn = most central room, stairs = random different room
  const mapCx = Math.floor(w / 2);
  const mapCy = Math.floor(h / 2);
  const spawnIdx = rooms.reduce((best, r, i) =>
    dist({ x: r.cx, y: r.cy }, { x: mapCx, y: mapCy }) <
    dist({ x: rooms[best].cx, y: rooms[best].cy }, { x: mapCx, y: mapCy })
      ? i : best, 0);
  let stairsIdx = randInt(0, rooms.length - 2);
  if (stairsIdx >= spawnIdx) stairsIdx++;
  const spawnRoom = rooms[spawnIdx];
  const stairsRoom = rooms[stairsIdx];
  const spawn: TilePos = { x: spawnRoom.cx, y: spawnRoom.cy };
  const stairs: TilePos = { x: stairsRoom.cx, y: stairsRoom.cy };

  // 8. Boss check (fixed chance from F7; can reappear until first kill in the run)
  const bossChance = hasKilledBossThisRun ? 0 : getBossSpawnChance(floor);
  const isBossFloor = floor >= BOSS_MIN_FLOOR && Math.random() < bossChance;
  let bossSpawn: TilePos | null = null;
  let statuePos: TilePos | null = null;

  if (isBossFloor && rooms.length >= 2) {
    const candidates = rooms.filter(r => r !== spawnRoom && r !== stairsRoom);
    if (candidates.length > 0) {
      const bossRoom = candidates[randInt(0, candidates.length - 1)];
      bossSpawn = { x: bossRoom.cx, y: bossRoom.cy };
    }
  }

  // 9. Enemies
  const enemySpawns = placeEnemies(cells, rooms, spawnRoom, spawn, stairs, floor, w, h, bossSpawn);

  // 10. Build occupied set
  const occupied = new Set<string>();
  occupied.add(`${spawn.x},${spawn.y}`);
  occupied.add(`${stairs.x},${stairs.y}`);
  for (const e of enemySpawns) occupied.add(`${e.pos.x},${e.pos.y}`);
  if (bossSpawn) occupied.add(`${bossSpawn.x},${bossSpawn.y}`);

  // No random floor treasure — loot only from chests and enemies
  const treasureSpawns: TreasureSpawnData[] = [];

  // 11. Chests
  const chestSpawns = placeChests(cells, occupied, rooms, spawnRoom, w, h, floor);
  for (const c of chestSpawns) occupied.add(`${c.x},${c.y}`);

  // 12. Traps
  const trapSpawns = placeTraps(cells, occupied, rooms, w, h, floor);
  for (const tr of trapSpawns) occupied.add(`${tr.pos.x},${tr.pos.y}`);

  // 13. Fountain
  const fountainSpawn = placeFountain(cells, occupied, rooms, spawnRoom, w, h);
  if (fountainSpawn) {
    occupied.add(`${fountainSpawn.x},${fountainSpawn.y}`);
    occupied.add(`${fountainSpawn.x},${fountainSpawn.y - 1}`);
  }

  // 14. Decorative props (inside rooms only, not in passages)
  const propSpawns = placeProps(cells, occupied, rooms, w, h);

  // 15. Wall decorative props (lights & planks on south-facing walls)
  const wallPropSpawns = placeWallProps(cells, rooms, spawn, stairs, w, h);

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
    fountainSpawn,
    propSpawns,
    wallPropSpawns,
    bossSpawn,
    statuePos,
  };
}

// ══════════════════════════════════════════════════════
// Placement helpers (unchanged)
// ══════════════════════════════════════════════════════

function getAllFloorTiles(cells: CellType[][], w: number, h: number): TilePos[] {
  const tiles: TilePos[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (cells[y][x] === CellType.FLOOR) tiles.push({ x, y });
    }
  }
  return tiles;
}

export function isInsideRoom(pos: TilePos, room: Room): boolean {
  return pos.x >= room.x && pos.x < room.x + room.w &&
         pos.y >= room.y && pos.y < room.y + room.h;
}

function placeEnemies(
  cells: CellType[][],
  rooms: Room[],
  spawnRoom: Room,
  spawn: TilePos,
  stairs: TilePos,
  floor: number,
  w: number,
  h: number,
  bossSpawn: TilePos | null,
): EnemySpawnData[] {
  const cfg = getEnemySpawnConfig(floor);
  const nonSpawnRooms = rooms.filter((r) => r !== spawnRoom);
  const roomMin = (room: Room) => (room.w * room.h <= 12 ? 1 : 2);
  const minRequired = nonSpawnRooms.reduce((sum, room) => sum + roomMin(room), 0);
  const total = Math.max(randInt(cfg.min, cfg.max), minRequired);

  const roomTiles: TilePos[][] = nonSpawnRooms.map((room) =>
    shuffle(
      getAllFloorTiles(cells, w, h).filter((t) =>
        isInsideRoom(t, room) &&
        !(t.x === spawn.x && t.y === spawn.y) &&
        !(t.x === stairs.x && t.y === stairs.y) &&
        !(bossSpawn && t.x === bossSpawn.x && t.y === bossSpawn.y),
      ),
    ),
  );

  const chosenPositions: TilePos[] = [];

  // Round 1: minimum enemies per room by room size.
  for (let i = 0; i < nonSpawnRooms.length; i++) {
    const need = roomMin(nonSpawnRooms[i]);
    for (let c = 0; c < need; c++) {
      const pos = roomTiles[i].pop();
      if (!pos) break;
      chosenPositions.push(pos);
    }
  }

  // Round 2: distribute remainder weighted by room area.
  let remaining = total - chosenPositions.length;
  while (remaining > 0) {
    const candidates: number[] = [];
    let totalWeight = 0;
    for (let i = 0; i < nonSpawnRooms.length; i++) {
      if (roomTiles[i].length === 0) continue;
      candidates.push(i);
      totalWeight += nonSpawnRooms[i].w * nonSpawnRooms[i].h;
    }
    if (candidates.length === 0) break;

    let roll = Math.random() * totalWeight;
    let picked = candidates[candidates.length - 1];
    for (const i of candidates) {
      roll -= nonSpawnRooms[i].w * nonSpawnRooms[i].h;
      if (roll <= 0) {
        picked = i;
        break;
      }
    }

    const pos = roomTiles[picked].pop();
    if (!pos) continue;
    chosenPositions.push(pos);
    remaining--;
  }

  const placedTotal = chosenPositions.length;
  const rockCount = Math.round(placedTotal * cfg.rockPct);
  const golemCount = Math.round(placedTotal * cfg.golemPct);
  const ghostCount = Math.max(0, placedTotal - rockCount - golemCount);

  const types: EnemyType[] = [
    ...Array(rockCount).fill(EnemyType.ROCK),
    ...Array(golemCount).fill(EnemyType.GOLEM),
    ...Array(ghostCount).fill(EnemyType.GHOST),
  ];
  shuffle(types);

  const enemies: EnemySpawnData[] = chosenPositions.map((pos, i) => ({
    pos,
    type: types[i] ?? EnemyType.ROCK,
  }));

  // Boss is extra on boss floors and does not consume normal enemy slots.
  if (bossSpawn) enemies.push({ pos: bossSpawn, type: EnemyType.BOSS });

  return enemies;
}

function getChestCount(floor: number): number {
  return Math.max(0, floor * 2);
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
  const isAdjacentToCorridor = (x: number, y: number): boolean => {
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (cells[ny][nx] !== CellType.FLOOR) continue;
      if (isCorridorTile(cells, nx, ny, w, h)) return true;
    }
    return false;
  };

  const nonSpawnRooms = rooms.filter((r) => r !== spawnRoom);
  const total = getChestCount(floor);

  const roomTiles: TilePos[][] = nonSpawnRooms.map((room) =>
    shuffle(
      getAllFloorTiles(cells, w, h).filter((t) =>
        isInsideRoom(t, room) &&
        !occupied.has(`${t.x},${t.y}`) &&
        !isCorridorTile(cells, t.x, t.y, w, h) &&
        !isAdjacentToCorridor(t.x, t.y),
      ),
    ),
  );

  const chests: TilePos[] = [];
  const hasMinSpacing = (pos: TilePos): boolean =>
    !chests.some((c) => Math.abs(c.x - pos.x) <= 1 && Math.abs(c.y - pos.y) <= 1);

  // Round 1: try to place one chest per room (spawn room excluded).
  // If total is smaller than room count, stop when total is reached.
  let remaining = total;
  const roomOrder = shuffle([...Array(nonSpawnRooms.length).keys()]);
  for (const i of roomOrder) {
    if (remaining <= 0) break;
    const idx = roomTiles[i].findIndex(hasMinSpacing);
    if (idx < 0) continue;
    const [pos] = roomTiles[i].splice(idx, 1);
    chests.push(pos);
    remaining--;
  }

  // Round 2: distribute remainder weighted by room area.
  while (remaining > 0) {
    const candidates: { i: number; idx: number }[] = [];
    let totalWeight = 0;
    for (let i = 0; i < nonSpawnRooms.length; i++) {
      if (roomTiles[i].length === 0) continue;
      const idx = roomTiles[i].findIndex(hasMinSpacing);
      if (idx < 0) continue;
      candidates.push({ i, idx });
      totalWeight += nonSpawnRooms[i].w * nonSpawnRooms[i].h;
    }
    if (candidates.length === 0) break;

    let roll = Math.random() * totalWeight;
    let picked = candidates[candidates.length - 1].i;
    for (const c of candidates) {
      roll -= nonSpawnRooms[c.i].w * nonSpawnRooms[c.i].h;
      if (roll <= 0) {
        picked = c.i;
        break;
      }
    }

    const pickedCandidate = candidates.find((c) => c.i === picked);
    if (!pickedCandidate) break;
    const [pos] = roomTiles[picked].splice(pickedCandidate.idx, 1);
    chests.push(pos);
    remaining--;
  }

  return chests;
}

function getTrapCount(floor: number): number {
  if (floor < 3) return 0; // No traps before floor 3
  if (floor <= 5) return randInt(2, 3);
  return randInt(3, 5);
}

export function isCorridorTile(cells: CellType[][], x: number, y: number, w: number, h: number): boolean {
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

export function isRoomEdge(cells: CellType[][], x: number, y: number, w: number, h: number): boolean {
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
    traps.push({ pos: candidates[i], type: TrapType.SPIKE });
  }
  return traps;
}

function placeFountain(
  cells: CellType[][],
  occupied: Set<string>,
  rooms: Room[],
  spawnRoom: Room,
  w: number,
  h: number,
): TilePos | null {
  const isAdjacentToCorridor = (x: number, y: number): boolean => {
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (cells[ny][nx] !== CellType.FLOOR) continue;
      if (isCorridorTile(cells, nx, ny, w, h)) return true;
    }
    return false;
  };

  const candidates: TilePos[] = [];
  for (const room of rooms) {
    if (room === spawnRoom) continue;
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (cells[y][x] !== CellType.FLOOR) continue;
        if (occupied.has(`${x},${y}`)) continue;
        // Fountain must be against a top wall for visual layering,
        // but never on/next to corridor tiles (no forced pickup at room entrances).
        if (y > 0 && cells[y - 1][x] === CellType.VOID && !occupied.has(`${x},${y - 1}`) &&
            !isCorridorTile(cells, x, y, w, h) &&
            !isAdjacentToCorridor(x, y)) {
          candidates.push({ x, y });
        }
      }
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function placeProps(
  cells: CellType[][],
  occupied: Set<string>,
  rooms: Room[],
  w: number,
  h: number,
): PropSpawnData[] {
  const props: PropSpawnData[] = [];
  const usedTiles = new Set<string>();

  for (const room of rooms) {
    const count = randInt(1, 3);

    // Collect candidate tiles strictly inside this room (not on edges that face passages)
    const candidates: TilePos[] = [];
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (cells[y][x] !== CellType.FLOOR) continue;
        const key = `${x},${y}`;
        if (occupied.has(key) || usedTiles.has(key)) continue;
        candidates.push({ x, y });
      }
    }
    shuffle(candidates);

    let placed = 0;
    for (const pos of candidates) {
      if (placed >= count) break;
      const type: PropType = Math.random() < 0.9 ? "rock_small" : "rock_big";
      props.push({ pos, type });
      usedTiles.add(`${pos.x},${pos.y}`);
      placed++;
    }
  }

  return props;
}

/**
 * Place decorative wall props (lights, planks) on south-facing walls.
 * South-facing = VOID tile with a FLOOR tile directly below it.
 */
function placeWallProps(
  cells: CellType[][],
  rooms: Room[],
  spawn: TilePos,
  stairs: TilePos,
  w: number,
  h: number,
): WallPropSpawnData[] {
  const props: WallPropSpawnData[] = [];
  const usedKeys = new Set<string>();
  const usedByType = new Map<WallPropType, Set<string>>([
    ["light", new Set<string>()],
    ["plank", new Set<string>()],
  ]);

  const isFloor = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && cells[y][x] === CellType.FLOOR;

  const isSouthFacingWall = (x: number, y: number) =>
    y >= 0 && y < h && x >= 0 && x < w &&
    cells[y][x] === CellType.VOID && isFloor(x, y + 1);

  // Minimum Manhattan distance between wall props of the SAME type.
  // 2 => prevents side-by-side adjacency and leaves at least one empty tile between them.
  const MIN_DIST = 2;
  const tooClose = (pos: TilePos, type: WallPropType) => {
    const used = usedByType.get(type);
    if (!used) return false;
    for (const key of used) {
      const [px, py] = key.split(",").map(Number);
      if (Math.abs(pos.x - px) + Math.abs(pos.y - py) < MIN_DIST) return true;
    }
    return false;
  };

  // Skip walls adjacent to spawn/stairs
  const isNearSpecial = (x: number, y: number) =>
    (Math.abs(x - spawn.x) <= 1 && Math.abs(y - spawn.y) <= 1) ||
    (Math.abs(x - stairs.x) <= 1 && Math.abs(y - stairs.y) <= 1);

  for (const room of rooms) {
    // Collect south-facing wall tiles belonging to this room
    // Check one row above the room (y = room.y - 1) and all interior rows
    const candidates: TilePos[] = [];
    for (let y = room.y - 1; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (!isSouthFacingWall(x, y)) continue;
        if (isNearSpecial(x, y)) continue;
        candidates.push({ x, y });
      }
    }
    shuffle(candidates);

    // Room size determines min lights: >= 5x3 → min 2, otherwise min 1
    const isLargeRoom = (room.w >= 5 && room.h >= 3) || (room.w >= 3 && room.h >= 5);
    const minLights = isLargeRoom ? 2 : 1;
    const maxLights = Math.max(minLights, randInt(minLights, 3));
    const maxPlanks = randInt(2, 4);
    let lights = 0;
    let planks = 0;

    // First pass: guarantee minimum lights
    for (const pos of candidates) {
      if (lights >= minLights) break;
      const key = `${pos.x},${pos.y}`;
      if (usedKeys.has(key) || tooClose(pos, "light")) continue;
      props.push({ pos, type: "light" });
      usedKeys.add(key);
      usedByType.get("light")?.add(key);
      lights++;
    }

    // Second pass: fill remaining lights + planks with probability
    for (const pos of candidates) {
      if (lights >= maxLights && planks >= maxPlanks) break;
      const key = `${pos.x},${pos.y}`;
      if (usedKeys.has(key)) continue;

      // ~40% chance per eligible tile
      if (Math.random() > 0.40) continue;

      let type: WallPropType;
      if (lights < maxLights && planks < maxPlanks) {
        type = Math.random() < 0.35 ? "light" : "plank";
      } else if (lights < maxLights) {
        type = "light";
      } else {
        type = "plank";
      }

      if (tooClose(pos, type)) continue;

      if (type === "light") lights++;
      else planks++;

      props.push({ pos, type });
      usedKeys.add(key);
      usedByType.get(type)?.add(key);
    }
  }

  return props;
}
