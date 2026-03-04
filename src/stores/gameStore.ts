import { create } from "zustand";
import { TurnPhase, type UpgradeId, type RunStats } from "@/game/types";
import { MAX_ENERGY_BASE } from "@/game/constants";

interface GameState {
  isRunning: boolean;
  floor: number;
  energy: number;
  maxEnergy: number;
  atk: number;
  treasureScore: number;
  coinsCollected: number;
  gemsCollected: number;
  goldenTicketsCollected: number;
  turnPhase: TurnPhase;
  upgrades: Record<string, number>;
  enemiesRemaining: number;
  enemiesKilled: number;
  bossesKilled: number;
  chestsOpened: number;
  trapsTriggered: number;
  poisonTurns: number; // remaining turns of poison DoT

  startRun: () => void;
  endRun: () => void;
  nextFloor: () => void;
  setEnergy: (e: number) => void;
  setMaxEnergy: (e: number) => void;
  setAtk: (a: number) => void;
  addTreasure: (type: "coin" | "gem" | "golden_ticket", value: number) => void;
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
}

export const useGameStore = create<GameState>((set, get) => ({
  isRunning: false,
  floor: 0,
  energy: MAX_ENERGY_BASE,
  maxEnergy: MAX_ENERGY_BASE,
  atk: 1,
  treasureScore: 0,
  coinsCollected: 0,
  gemsCollected: 0,
  goldenTicketsCollected: 0,
  turnPhase: TurnPhase.PLAYER_INPUT,
  upgrades: {},
  enemiesRemaining: 0,
  enemiesKilled: 0,
  bossesKilled: 0,
  chestsOpened: 0,
  trapsTriggered: 0,
  poisonTurns: 0,

  startRun: () =>
    set({
      isRunning: true,
      floor: 1,
      energy: MAX_ENERGY_BASE,
      maxEnergy: MAX_ENERGY_BASE,
      atk: 1,
      treasureScore: 0,
      coinsCollected: 0,
      gemsCollected: 0,
      goldenTicketsCollected: 0,
      turnPhase: TurnPhase.PLAYER_INPUT,
      upgrades: {},
      enemiesRemaining: 0,
      enemiesKilled: 0,
      bossesKilled: 0,
      chestsOpened: 0,
      trapsTriggered: 0,
      poisonTurns: 0,
    }),

  endRun: () => set({ isRunning: false }),

  nextFloor: () => set((s) => ({ floor: s.floor + 1 })),

  setEnergy: (e) => set({ energy: Math.max(0, e) }),

  setMaxEnergy: (e) => set({ maxEnergy: e }),

  setAtk: (a) => set({ atk: a }),

  addTreasure: (type, value) =>
    set((s) => ({
      treasureScore: s.treasureScore + value,
      coinsCollected: s.coinsCollected + (type === "coin" ? 1 : 0),
      gemsCollected: s.gemsCollected + (type === "gem" ? 1 : 0),
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

  getStats: () => {
    const s = get();
    return {
      floorsCleared: s.floor - 1,
      totalTreasure: s.treasureScore,
      coinsCollected: s.coinsCollected,
      gemsCollected: s.gemsCollected,
      goldenTicketsCollected: s.goldenTicketsCollected,
      enemiesKilled: s.enemiesKilled,
      bossesKilled: s.bossesKilled,
      chestsOpened: s.chestsOpened,
      trapsTriggered: s.trapsTriggered,
      upgradesTaken: Object.keys(s.upgrades) as UpgradeId[],
    };
  },
}));
