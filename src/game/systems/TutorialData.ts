import {
  CellType,
  EnemyType,
  TrapType,
  type ChestSpawnData,
  type EnemySpawnData,
  type FloorMap,
  type RoomBounds,
  type TilePos,
  type TrapSpawnData,
} from "../types";

export interface TutorialStepDef {
  id: string;
  floor: number;
  title: string;
  dialogue: string;
  hint: string;
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    id: "F1_ROOM1",
    floor: 1,
    title: "Floor 1 / Room 1",
    dialogue: "Find the door! But keep an eye on your energy.",
    hint: "",
  },
  {
    id: "F1_ROOM2",
    floor: 1,
    title: "Floor 1 / Room 2",
    dialogue: "Clear the Ghost, break the crate, then take the stairs.",
    hint: "",
  },
  {
    id: "UPGRADE_PICK",
    floor: 1,
    title: "Upgrade",
    dialogue: "Choose Wisely! It may dictate your destiny.",
    hint: "",
  },
  {
    id: "F2_ROOM1",
    floor: 2,
    title: "Floor 2 / Room 1",
    dialogue: "FIND SOVA AND KILL HIM!",
    hint: "",
  },
  {
    id: "F2_ROOM1_LOOT",
    floor: 2,
    title: "Floor 2 / Loot",
    dialogue: "Good. Loot matters. Keep pushing.",
    hint: "",
  },
  {
    id: "F2_BOSS_ROOM",
    floor: 2,
    title: "Floor 2 / Boss Room",
    dialogue: "Finish SOVA and grab the Golden Ticket.",
    hint: "",
  },
  {
    id: "FINISHED",
    floor: 2,
    title: "Completed",
    dialogue: "You're ready to find a real one now!",
    hint: "",
  },
];

function parseTutorialFloor(rows: string[], floor: number): FloorMap {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const cells: CellType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => CellType.VOID),
  );

  let spawn: TilePos | null = null;
  let stairs: TilePos | null = null;
  const enemySpawns: EnemySpawnData[] = [];
  const chestSpawns: ChestSpawnData[] = [];
  const trapSpawns: TrapSpawnData[] = [];
  let fountainSpawn: TilePos | null = null;
  const tutorialChestTextureKeys = ["chest-1", "chest-2", "chest-3", "chest-4", "chest-5", "chest-6"] as const;
  let tutorialChestIdx = 0;
  const makeChestSpawn = (x: number, y: number): ChestSpawnData => {
    const textureKey = tutorialChestTextureKeys[tutorialChestIdx % tutorialChestTextureKeys.length];
    tutorialChestIdx++;
    return { pos: { x, y }, textureKey };
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x];
      const isFloor = ch !== "#";
      cells[y][x] = isFloor ? CellType.FLOOR : CellType.VOID;

      if (ch === "P") spawn = { x, y };
      else if (ch === "S") stairs = { x, y };
      else if (ch === "R") enemySpawns.push({ pos: { x, y }, type: EnemyType.ROCK });
      else if (ch === "K") enemySpawns.push({ pos: { x, y }, type: EnemyType.ROCK2 });
      else if (ch === "M") enemySpawns.push({ pos: { x, y }, type: EnemyType.GOLEM });
      else if (ch === "G") enemySpawns.push({ pos: { x, y }, type: EnemyType.GHOST });
      else if (ch === "O") enemySpawns.push({ pos: { x, y }, type: EnemyType.BOSS });
      else if (ch === "C" || ch === "B") chestSpawns.push(makeChestSpawn(x, y));
      else if (ch === "H") {
        chestSpawns.push(makeChestSpawn(x, y));
        trapSpawns.push({ pos: { x, y }, type: TrapType.SPIKE, hidden: true });
      } else if (ch === "^") trapSpawns.push({ pos: { x, y }, type: TrapType.SPIKE, hidden: false });
      else if (ch === "v") trapSpawns.push({ pos: { x, y }, type: TrapType.SPIKE, hidden: true });
      else if (ch === "F") fountainSpawn = { x, y };
    }
  }

  if (!spawn) throw new Error(`Tutorial floor ${floor}: missing spawn`);
  if (!stairs) throw new Error(`Tutorial floor ${floor}: missing stairs`);

  const room: RoomBounds = {
    x: 1,
    y: 1,
    w: Math.max(1, width - 2),
    h: Math.max(1, height - 2),
  };

  const bossSpawn =
    enemySpawns.find((e) => e.type === EnemyType.BOSS)?.pos ?? null;

  return {
    width,
    height,
    cells,
    spawn,
    stairs,
    enemySpawns,
    treasureSpawns: [],
    chestSpawns,
    trapSpawns,
    fountainSpawn,
    propSpawns: [],
    wallPropSpawns: [],
    bossSpawn,
    statuePos: null,
    rooms: [room],
  };
}

const TUTORIAL_FLOOR_1 = [
  "##########################",
  "##########################",
  "###########..........#####",
  "##.....F.##..........#####",
  "##.P..........BSG....#####",
  "##.......##..........#####",
  "###########..........#####",
  "##########################",
  "##########################",
  "##########################",
  "##########################",
];

const TUTORIAL_FLOOR_2 = [
  "#########################S",
  "##########################",
  "##########################",
  "##...K...##.F.##.........#",
  "##.P..MC.........BR.....O#",
  "##.......##.H.##.........#",
  "##########################",
  "##########################",
  "##########################",
  "##########################",
  "##########################",
];

function findPos(rows: string[], target: string): TilePos | undefined {
  for (let y = 0; y < rows.length; y++) {
    const x = rows[y].indexOf(target);
    if (x !== -1) return { x, y };
  }
  return undefined;
}

export function getTutorialFloorMap(floor: number): FloorMap {
  if (floor <= 1) return parseTutorialFloor(TUTORIAL_FLOOR_1, 1);
  return parseTutorialFloor(TUTORIAL_FLOOR_2, 2);
}

export function getTutorialNextFloor(currentFloor: number): number {
  return currentFloor >= 2 ? 2 : currentFloor + 1;
}

export interface TutorialMarkers {
  room2EntryPos?: TilePos;
  floor1BreakablePos?: TilePos;
  floor1GhostPos?: TilePos;
  floor2RockNearBossChestPos?: TilePos;
  floor2BossEntryPos?: TilePos;
  floor2OrbChestPos?: TilePos;
  floor2BossChestPos?: TilePos;
  floor2BossSpikePos?: TilePos;
}

export function getTutorialMarkers(floor: number): TutorialMarkers {
  if (floor <= 1) {
    return {
      room2EntryPos: { x: 11, y: 4 },
      floor1BreakablePos: findPos(TUTORIAL_FLOOR_1, "B"),
      floor1GhostPos: findPos(TUTORIAL_FLOOR_1, "G"),
    };
  }

  return {
    floor2RockNearBossChestPos: findPos(TUTORIAL_FLOOR_2, "R"),
    floor2BossEntryPos: { x: 16, y: 4 },
    floor2OrbChestPos: findPos(TUTORIAL_FLOOR_2, "C"),
    floor2BossChestPos: findPos(TUTORIAL_FLOOR_2, "B"),
    floor2BossSpikePos: findPos(TUTORIAL_FLOOR_2, "H"),
  };
}
