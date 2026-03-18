import {
  CellType,
  EnemyType,
  TrapType,
  type EnemySpawnData,
  type FloorMap,
  type RoomBounds,
  type TilePos,
  type TrapSpawnData,
} from "../types";

export interface TutorialStepDef {
  id: string;
  floor: string;
  title: string;
  objective: string;
  gate: string;
  inputPolicy: string;
  meta: string;
  tech: string[];
  actions: string[];
  dialogue: string;
  hint: string;
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    id: "S0",
    floor: "T1",
    title: "Intro and movement",
    objective: "Move two tiles.",
    gate: "playerMovesCount >= 2",
    inputPolicy: "LOCKED during Astro line, then UNLOCKED.",
    meta: "Safe room. No enemies.",
    tech: ["Show movement arrows", "Pulse energy HUD once"],
    actions: ["Move in any direction twice", "Observe turn cadence"],
    dialogue: "Welcome to SOVA. Move two tiles to begin.",
    hint: "Use arrows or WASD.",
  },
  {
    id: "S1",
    floor: "T1",
    title: "First combat",
    objective: "Kill one Rock by bump attack.",
    gate: "killsTutorial >= 1",
    inputPolicy: "UNLOCKED.",
    meta: "Single-lane encounter.",
    tech: ["No extra enemies spawn"],
    actions: ["Approach Rock", "Bump until it dies"],
    dialogue: "Bump into enemies to attack. Kill this Rock.",
    hint: "Bump into enemies to attack.",
  },
  {
    id: "S2",
    floor: "T1",
    title: "Breakable and chest",
    objective: "Break and open that chest.",
    gate: "breakablesDestroyed >= 1 && chestsOpened >= 1",
    inputPolicy: "UNLOCKED.",
    meta: "Chest gated by breakable.",
    tech: ["Tutorial chest guaranteed energy drop"],
    actions: ["Break blocking crate", "Open chest behind it"],
    dialogue: "Break the crate, then open the chest.",
    hint: "Attack the chest by moving into it.",
  },
  {
    id: "S3",
    floor: "T1",
    title: "Trap awareness",
    objective: "Trigger one trap safely.",
    gate: "trapsTriggered >= 1",
    inputPolicy: "UNLOCKED.",
    meta: "Controlled trap damage.",
    tech: ["Trap override damage = 2 in tutorial"],
    actions: ["Step on highlighted trap once"],
    dialogue: "Traps cost energy. Learn to read the floor.",
    hint: "Step on the trap tile.",
  },
  {
    id: "S4",
    floor: "T1",
    title: "Fountain usage",
    objective: "Use fountain and recover energy.",
    gate: "fountainUsed === true",
    inputPolicy: "UNLOCKED.",
    meta: "One-time fountain.",
    tech: ["Show clear bar recovery feedback"],
    actions: ["Step on fountain tile"],
    dialogue: "Fountains restore energy. Use this one now.",
    hint: "Walk over the fountain tile.",
  },
  {
    id: "S5",
    floor: "T1",
    title: "Stairs to next floor",
    objective: "Use stairs to leave T1.",
    gate: "tutorialFloor === 2",
    inputPolicy: "LOCKED for line, then UNLOCKED.",
    meta: "Direct stairs path.",
    tech: ["Normal transition VFX"],
    actions: ["Reach stairs", "Enter stairs"],
    dialogue: "Good. Use stairs and go deeper.",
    hint: "Stairs unlock after objective completion.",
  },
  {
    id: "S6",
    floor: "T2",
    title: "Pass Turn",
    objective: "Use PASS once, then move once.",
    gate: "didPass && movedAfterPass",
    inputPolicy: "UNLOCKED.",
    meta: "Low-pressure turn economy lesson.",
    tech: ["Highlight PASS button first time"],
    actions: ["Tap PASS", "Make one normal move after pass"],
    dialogue: "PASS spends a turn. Use it smart.",
    hint: "Great for baiting enemy movement.",
  },
  {
    id: "S7",
    floor: "T2",
    title: "Upgrade pick",
    objective: "Choose one upgrade card.",
    gate: "upgradeChosen === true",
    inputPolicy: "LOCKED until selection.",
    meta: "Three curated beginner options.",
    tech: ["Persist selection for remaining tutorial"],
    actions: ["Open upgrade overlay", "Pick one card"],
    dialogue: "Choose one upgrade. Keep it simple.",
    hint: "Build evolves later.",
  },
  {
    id: "S8",
    floor: "T2",
    title: "Jump to boss layer",
    objective: "Take jump stairs to boss layer.",
    gate: "tutorialFloor === 3",
    inputPolicy: "LOCKED for intro, then UNLOCKED.",
    meta: "Fast-forward to boss training.",
    tech: ["Load fixed T3 map", "Display floor label as F7"],
    actions: ["Reach jump stairs", "Confirm transition"],
    dialogue: "Now we jump to Floor 7. Time for SOVA.",
    hint: "Tutorial-only skip.",
  },
  {
    id: "S9",
    floor: "T3/F7",
    title: "Boss discovery",
    objective: "Reveal SOVA in fog.",
    gate: "bossSeen === true",
    inputPolicy: "LOCKED for line, then UNLOCKED.",
    meta: "Compact arena, deterministic AI.",
    tech: ["Boss-spot SFX once"],
    actions: ["Advance in arena", "Bring boss into visibility"],
    dialogue: "There it is. Corner SOVA and finish the fight.",
    hint: "SOVA is easier in tutorial.",
  },
  {
    id: "S10",
    floor: "T3/F7",
    title: "Kill SOVA",
    objective: "Defeat SOVA.",
    gate: "sovaKilled === true",
    inputPolicy: "UNLOCKED.",
    meta: "Tutorial boss override: HP3 DMG3 no flee.",
    tech: ["Disable advanced random behavior"],
    actions: ["Land final hit"],
    dialogue: "One more hit. Finish SOVA.",
    hint: "Keep pressure.",
  },
  {
    id: "S11",
    floor: "T3/F7",
    title: "Collect Golden Ticket",
    objective: "Pick up guaranteed ticket drop.",
    gate: "ticketCollected === true",
    inputPolicy: "LOCKED for completion line after pickup.",
    meta: "Final onboarding reward action.",
    tech: ["Set tutorialCompleted=true", "Route to lobby"],
    actions: ["Move onto ticket", "Complete tutorial"],
    dialogue: "You got the Golden Ticket. Tutorial complete.",
    hint: "Next Play enters normal run.",
  },
];

function parseTutorialFloor(
  rows: string[],
  floor: number,
): FloorMap {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const cells: CellType[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => CellType.VOID),
  );

  let spawn: TilePos | null = null;
  let stairs: TilePos | null = null;
  const enemySpawns: EnemySpawnData[] = [];
  const chestSpawns: TilePos[] = [];
  const trapSpawns: TrapSpawnData[] = [];
  let fountainSpawn: TilePos | null = null;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x];
      const isFloor = ch !== "#";
      cells[y][x] = isFloor ? CellType.FLOOR : CellType.VOID;

      if (ch === "P") spawn = { x, y };
      else if (ch === "S") stairs = { x, y };
      else if (ch === "R") enemySpawns.push({ pos: { x, y }, type: EnemyType.ROCK });
      else if (ch === "O") enemySpawns.push({ pos: { x, y }, type: EnemyType.BOSS });
      else if (ch === "C") chestSpawns.push({ x, y });
      else if (ch === "B") chestSpawns.push({ x, y });
      else if (ch === "^") trapSpawns.push({ pos: { x, y }, type: TrapType.SPIKE, hidden: false });
      else if (ch === "F") fountainSpawn = { x, y };
    }
  }

  if (!spawn) throw new Error(`Tutorial floor ${floor}: missing spawn`);
  if (!stairs) throw new Error(`Tutorial floor ${floor}: missing stairs`);

  const room: RoomBounds = { x: 1, y: 1, w: Math.max(1, width - 2), h: Math.max(1, height - 2) };

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
    bossSpawn: enemySpawns.some((e) => e.type === EnemyType.BOSS)
      ? enemySpawns.find((e) => e.type === EnemyType.BOSS)!.pos
      : null,
    statuePos: null,
    rooms: [room],
  };
}

const TUTORIAL_FLOOR_1 = [
  "###############",
  "#.............#",
  "#......R......#",
  "#.............#",
  "#..B....C..F..#",
  "#.............#",
  "#..P.......S..#",
  "#......^......#",
  "###############",
];

const TUTORIAL_FLOOR_2 = [
  "###############",
  "#..P....V.....#",
  "#......R......#",
  "#......U......#",
  "#.........S...#",
  "###############",
];

const TUTORIAL_FLOOR_7 = [
  "#######################",
  "#.....................#",
  "#..P..................#",
  "#.....................#",
  "#.....................#",
  "#...............O.....#",
  "#..................S..#",
  "#######################",
];

export function getTutorialFloorMap(floor: number): FloorMap {
  if (floor <= 1) return parseTutorialFloor(TUTORIAL_FLOOR_1, 1);
  if (floor === 2) return parseTutorialFloor(TUTORIAL_FLOOR_2, 2);
  return parseTutorialFloor(TUTORIAL_FLOOR_7, floor);
}

export function getTutorialNextFloor(currentFloor: number): number {
  if (currentFloor <= 1) return 2;
  if (currentFloor === 2) return 7;
  return currentFloor + 1;
}

export interface TutorialMarkers {
  breakablePos?: TilePos;
  chestPos?: TilePos;
  passPos?: TilePos;
  upgradePos?: TilePos;
}

export function getTutorialMarkers(floor: number): TutorialMarkers {
  if (floor <= 1) {
    return {
      breakablePos: { x: 3, y: 4 },
      chestPos: { x: 8, y: 4 },
    };
  }
  if (floor === 2) {
    return {
      passPos: { x: 7, y: 1 },
      upgradePos: { x: 7, y: 3 },
    };
  }
  return {};
}
