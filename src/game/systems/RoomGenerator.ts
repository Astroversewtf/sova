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
} from "../types";
import {
  getFloorSize,
  getEnemyCount,
  getTreasureCount,
  TREASURE_WEIGHTS,
  TREASURE_VALUES,
  BOSS_MIN_FLOOR,
  BOSS_CHANCE,
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
  return Math.min(15, 9 + (floor - 8));
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

    // Valid Y range: at least 1 tile of perpendicular overlap with parent
    const yMin = Math.max(border, parent.y - ch + 1);
    const yMax = Math.min(gridH - border - ch, parent.y + parent.h - 1);
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

    // Valid X range: at least 1 tile of perpendicular overlap with parent
    const xMin = Math.max(border, parent.x - cw + 1);
    const xMax = Math.min(gridW - border - cw, parent.x + parent.w - 1);
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

      // Horizontal adjacency: exactly 2 tiles apart with Y overlap
      const gapR = b.x - (a.x + a.w);
      const gapL = a.x - (b.x + b.w);
      const yTop = Math.max(a.y, b.y);
      const yBot = Math.min(a.y + a.h, b.y + b.h);

      if (gapR === PASSAGE_GAP && yBot > yTop) {
        extras.push({ a: i, b: j, dir: "right" });
        continue;
      }
      if (gapL === PASSAGE_GAP && yBot > yTop) {
        extras.push({ a: i, b: j, dir: "left" });
        continue;
      }

      // Vertical adjacency: exactly 2 tiles apart with X overlap
      const gapD = b.y - (a.y + a.h);
      const gapU = a.y - (b.y + b.h);
      const xLeft = Math.max(a.x, b.x);
      const xRight = Math.min(a.x + a.w, b.x + b.w);

      if (gapD === PASSAGE_GAP && xRight > xLeft) {
        extras.push({ a: i, b: j, dir: "down" });
        continue;
      }
      if (gapU === PASSAGE_GAP && xRight > xLeft) {
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
 * Falls back to center of raw overlap if the safe range is empty.
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
  // Overlap too small for safe range — use center of raw overlap
  return Math.floor((rawMin + rawMax) / 2);
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

export function generateFloor(floor: number): FloorMap {
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

  // 7. Spawn/stairs via graph diameter (BFS)
  const edgePairs: [number, number][] = allConnections.map(c => [c.a, c.b]);
  const adj = buildAdjList(rooms.length, edgePairs);
  const spawnIdx = bfsFarthest(adj, 0);
  const stairsIdx = bfsFarthest(adj, spawnIdx);
  const spawnRoom = rooms[spawnIdx];
  const stairsRoom = rooms[stairsIdx === spawnIdx ? (spawnIdx + 1) % rooms.length : stairsIdx];
  const spawn: TilePos = { x: spawnRoom.cx, y: spawnRoom.cy };
  const stairs: TilePos = { x: stairsRoom.cx, y: stairsRoom.cy };

  // 8. Boss check
  const isBossFloor = floor >= BOSS_MIN_FLOOR && Math.random() < BOSS_CHANCE;
  let bossSpawn: TilePos | null = null;
  let statuePos: TilePos | null = null;

  if (isBossFloor && rooms.length >= 3) {
    const candidates = rooms.filter(r => r !== spawnRoom && r !== stairsRoom);
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
    const statueRoom = candidates.length > 1 ? candidates[candidates.length - 1] : null;
    if (statueRoom) {
      statuePos = { x: statueRoom.cx, y: statueRoom.cy };
    }
  }

  // 9. Enemies
  const enemySpawns = placeEnemies(cells, spawn, stairs, floor, isBossFloor, bossSpawn, w, h, spawnRoom);

  // 10. Build occupied set
  const occupied = new Set<string>();
  occupied.add(`${spawn.x},${spawn.y}`);
  occupied.add(`${stairs.x},${stairs.y}`);
  for (const e of enemySpawns) occupied.add(`${e.pos.x},${e.pos.y}`);
  if (bossSpawn) occupied.add(`${bossSpawn.x},${bossSpawn.y}`);
  if (statuePos) occupied.add(`${statuePos.x},${statuePos.y}`);

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
  spawn: TilePos,
  stairs: TilePos,
  floor: number,
  isBossFloor: boolean,
  bossSpawn: TilePos | null,
  w: number,
  h: number,
  spawnRoom: Room,
): EnemySpawnData[] {
  if (isBossFloor && bossSpawn) {
    return [{ pos: bossSpawn, type: EnemyType.BOSS }];
  }

  const { basic, tanky } = getEnemyCount(floor);
  const candidates = shuffle(
    getAllFloorTiles(cells, w, h).filter(
      (t) =>
        !isInsideRoom(t, spawnRoom) &&
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
    const type = Math.random() < 0.6 ? TrapType.SPIKE : TrapType.POISON;
    traps.push({ pos: candidates[i], type });
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
  const candidates: TilePos[] = [];
  for (const room of rooms) {
    if (room === spawnRoom) continue;
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (cells[y][x] !== CellType.FLOOR) continue;
        if (occupied.has(`${x},${y}`)) continue;
        if (y > 0 && cells[y - 1][x] === CellType.VOID && !occupied.has(`${x},${y - 1}`)) {
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
