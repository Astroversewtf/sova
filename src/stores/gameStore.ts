import { create } from "zustand";
import { TurnPhase, type UpgradeId, type RunStats } from "@/game/types";
import { MAX_ENERGY_BASE } from "@/game/constants";

export interface GameOverData {
  stats: RunStats;
  floor: number;
}

interface GameState {
  isRunning: boolean;
  floor: number;
  energy: number;
  maxEnergy: number;
  atk: number;
  treasureScore: number;
  coinsCollected: number;
  orbsCollected: number;
  goldenTicketsCollected: number;
  turnPhase: TurnPhase;
  upgrades: Record<string, number>;
  enemiesRemaining: number;
  enemiesKilled: number;
  bossesKilled: number;
  chestsOpened: number;
  trapsTriggered: number;
  poisonTurns: number; // remaining turns of poison DoT
  upgradeScreenFloor: number | null; // non-null = upgrade overlay visible
  rerollCount: number; // persists across floors within a run
  gameOverData: GameOverData | null; // non-null = game over overlay visible

  startRun: () => void;
  endRun: () => void;
  nextFloor: () => void;
  setEnergy: (e: number) => void;
  setMaxEnergy: (e: number) => void;
  setAtk: (a: number) => void;
  addTreasure: (type: "coin" | "orb" | "golden_ticket", value: number) => void;
  setTurnPhase: (phase: TurnPhase) => void;
  addUpgrade: (id: UpgradeId) => void;
  getUpgradeStacks: (id: UpgradeId) => number;
  incrementKills: () => void;
  incrementBossKills: () => void;
  setEnemiesRemaining: (n: number) => void;
  incrementChests: () => void;
  incrementTraps: () => void;
  setPoisonTurns: (n: number) => void;
  tickPoison: () => number; // returns damage dealt this tick
  getStats: () => RunStats;
  showUpgradeScreen: (floor: number) => void;
  hideUpgradeScreen: () => void;
  showGameOver: (data: GameOverData) => void;
  hideGameOver: () => void;
  spendCoins: (amount: number) => void;
  incrementReroll: () => void;
  getRerollCost: () => number;
}

export const useGameStore = create<GameState>((set, get) => ({
  isRunning: false,
  floor: 0,
  energy: MAX_ENERGY_BASE,
  maxEnergy: MAX_ENERGY_BASE,
  atk: 1,
  treasureScore: 0,
  coinsCollected: 0,
  orbsCollected: 0,
  goldenTicketsCollected: 0,
  turnPhase: TurnPhase.PLAYER_INPUT,
  upgrades: {},
  enemiesRemaining: 0,
  enemiesKilled: 0,
  bossesKilled: 0,
  chestsOpened: 0,
  trapsTriggered: 0,
  poisonTurns: 0,
  upgradeScreenFloor: null,
  rerollCount: 0,
  gameOverData: null,

  startRun: () =>
    set({
      isRunning: true,
      floor: 1,
      energy: MAX_ENERGY_BASE,
      maxEnergy: MAX_ENERGY_BASE,
      atk: 1,
      treasureScore: 0,
      coinsCollected: 0,
      orbsCollected: 0,
      goldenTicketsCollected: 0,
      turnPhase: TurnPhase.PLAYER_INPUT,
      upgrades: {},
      enemiesRemaining: 0,
      enemiesKilled: 0,
      bossesKilled: 0,
      chestsOpened: 0,
      trapsTriggered: 0,
      poisonTurns: 0,
      rerollCount: 0,
    }),

  endRun: () => set({ isRunning: false, gameOverData: null }),

  nextFloor: () => set((s) => ({ floor: s.floor + 1 })),

  setEnergy: (e) => set({ energy: Math.max(0, e) }),

  setMaxEnergy: (e) => set({ maxEnergy: e }),

  setAtk: (a) => set({ atk: a }),

  addTreasure: (type, value) =>
    set((s) => ({
      treasureScore: s.treasureScore + value,
      coinsCollected: s.coinsCollected + (type === "coin" ? 1 : 0),
      orbsCollected: s.orbsCollected + (type === "orb" ? 1 : 0),
      goldenTicketsCollected: s.goldenTicketsCollected + (type === "golden_ticket" ? 1 : 0),
    })),

  setTurnPhase: (phase) => set({ turnPhase: phase }),

  addUpgrade: (id) =>
    set((s) => ({
      upgrades: {
        ...s.upgrades,
        [id]: (s.upgrades[id] ?? 0) + 1,
      },
    })),

  getUpgradeStacks: (id) => get().upgrades[id] ?? 0,

  incrementKills: () =>
    set((s) => ({
      enemiesKilled: s.enemiesKilled + 1,
      enemiesRemaining: Math.max(0, s.enemiesRemaining - 1),
    })),

  incrementBossKills: () =>
    set((s) => ({
      bossesKilled: s.bossesKilled + 1,
      enemiesKilled: s.enemiesKilled + 1,
      enemiesRemaining: Math.max(0, s.enemiesRemaining - 1),
    })),

  setEnemiesRemaining: (n) => set({ enemiesRemaining: n }),

  incrementChests: () => set((s) => ({ chestsOpened: s.chestsOpened + 1 })),

  incrementTraps: () => set((s) => ({ trapsTriggered: s.trapsTriggered + 1 })),

  setPoisonTurns: (n) => set({ poisonTurns: n }),

  tickPoison: () => {
    const s = get();
    if (s.poisonTurns <= 0) return 0;
    const dmg = 1;
    set({
      energy: Math.max(0, s.energy - dmg),
      poisonTurns: s.poisonTurns - 1,
    });
    return dmg;
  },

  showUpgradeScreen: (floor) => set({ upgradeScreenFloor: floor }),
  hideUpgradeScreen: () => set({ upgradeScreenFloor: null }),

  showGameOver: (data) => set({ gameOverData: data }),
  hideGameOver: () => set({ gameOverData: null }),

  spendCoins: (amount) =>
    set((s) => ({ coinsCollected: Math.max(0, s.coinsCollected - amount) })),

  incrementReroll: () => set((s) => ({ rerollCount: s.rerollCount + 1 })),

  getRerollCost: () => {
    const n = get().rerollCount;
    // Fibonacci starting at 10, 20: 10, 20, 30, 50, 80, 130, ...
    if (n === 0) return 10;
    if (n === 1) return 20;
    let a = 10, b = 20;
    for (let i = 2; i <= n; i++) {
      const next = a + b;
      a = b;
      b = next;
    }
    return b;
  },

  getStats: () => {
    const s = get();
    return {
      floorsCleared: s.floor - 1,
      totalTreasure: s.treasureScore,
      coinsCollected: s.coinsCollected,
      orbsCollected: s.orbsCollected,
      goldenTicketsCollected: s.goldenTicketsCollected,
      enemiesKilled: s.enemiesKilled,
      bossesKilled: s.bossesKilled,
      chestsOpened: s.chestsOpened,
      trapsTriggered: s.trapsTriggered,
      upgradesTaken: Object.keys(s.upgrades) as UpgradeId[],
    };
  },
}));
