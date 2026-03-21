import { create } from "zustand";
import {
  TurnPhase,
  type ActiveBuffState,
  type BuffId,
  type EvolutionPath,
  type EvolutionTier,
  type RunStats,
  type TreasureType,
  type UpgradeId,
} from "@/game/types";
import { MAX_ENERGY_BASE, UPGRADE_BY_ID } from "@/game/constants";

export interface GameOverData {
  stats: RunStats;
  floor: number;
}

type BuildTierValue = 0 | EvolutionTier;

const ATTACK_BONUS_BY_TIER: Record<BuildTierValue, number> = {
  0: 0,
  1: 0.5,
  2: 1,
  3: 2,
};

const DEFENSE_REDUCTION_BY_TIER: Record<BuildTierValue, number> = {
  0: 0,
  1: 0.5,
  2: 1,
  3: 2,
};

const DEFENSE_DODGE_BY_TIER: Record<BuildTierValue, number> = {
  0: 0,
  1: 0,
  2: 0,
  3: 0.2,
};

const UTILITY_MAX_ENERGY_BY_TIER: Record<BuildTierValue, number> = {
  0: 0,
  1: 15,
  2: 30,
  3: 50,
};

const UTILITY_REGEN_CHANCE_BY_TIER: Record<BuildTierValue, number> = {
  0: 0,
  1: 0.05,
  2: 0.1,
  3: 0.2,
};

const FREE_MOVE_BUFFS: BuffId[] = ["buff_quick_burst", "buff_momentum_rush"];

function getEvolutionId(path: EvolutionPath, tier: BuildTierValue): UpgradeId | null {
  if (tier === 0) return null;
  if (path === "attack") return `evo_rift_fang_t${tier}`;
  if (path === "defense") return `evo_stone_veil_t${tier}`;
  return `evo_volt_core_t${tier}`;
}

interface GameState {
  isRunning: boolean;
  tutorialMode: boolean;
  floor: number;
  energy: number;
  maxEnergy: number;
  atk: number;
  treasureScore: number;
  coinsCollected: number;
  orbsCollected: number;
  goldenTicketsCollected: number;
  turnPhase: TurnPhase;

  buildTiers: Record<EvolutionPath, BuildTierValue>;
  activeBuffs: ActiveBuffState[];
  upgradeHistory: UpgradeId[];
  damageTakenPool: number;

  enemiesRemaining: number;
  enemiesKilled: number;
  bossesKilled: number;
  chestsOpened: number;
  trapsTriggered: number;
  poisonTurns: number;
  upgradeScreenFloor: number | null;
  upgradesGiven: number;
  keysUsed: number;
  rerollCount: number;
  gameOverData: GameOverData | null;
  lootPhase: "coins" | "orbs" | "summary" | null;
  runEndActive: boolean;

  startRun: (keysUsed?: number, tutorialMode?: boolean) => void;
  endRun: () => void;
  nextFloor: () => void;
  setFloor: (floor: number) => void;
  setEnergy: (e: number) => void;
  setMaxEnergy: (e: number) => void;
  setAtk: (a: number) => void;
  addTreasure: (type: "coin" | "orb" | "golden_ticket", value: number) => void;
  setTurnPhase: (phase: TurnPhase) => void;
  addUpgrade: (id: UpgradeId) => void;
  advanceUpgradeRound: () => void;

  getBuildTier: (path: EvolutionPath) => BuildTierValue;
  getBuildUpgradeIds: () => UpgradeId[];
  getActiveBuffIds: () => BuffId[];
  hasActiveBuff: (id: BuffId) => boolean;

  getAttackBonus: () => number;
  getDamageReduction: () => number;
  getCritChance: () => number;
  getDodgeChance: () => number;
  getRegenOnKillChance: () => number;
  getLootMagnetRadius: () => number;
  getLootMultiplier: (type: TreasureType) => number;
  getExtraDropChance: () => number;
  consumeFreeMove: () => boolean;

  recordDamageTaken: (amount: number) => void;
  consumeDamageTakenPool: () => number;

  incrementKills: () => void;
  incrementBossKills: () => void;
  setEnemiesRemaining: (n: number) => void;
  incrementChests: () => void;
  incrementTraps: () => void;
  setPoisonTurns: (n: number) => void;
  tickPoison: () => number;
  getStats: () => RunStats;
  showUpgradeScreen: (floor: number) => void;
  hideUpgradeScreen: () => void;
  showGameOver: (data: GameOverData) => void;
  hideGameOver: () => void;
  startLootReveal: (data: GameOverData) => void;
  advanceLootPhase: () => void;
  setRunEndActive: (active: boolean) => void;
  spendCoins: (amount: number) => void;
  incrementReroll: () => void;
  getRerollCost: () => number;
}

function normalizeActiveBuffs(activeBuffs: ActiveBuffState[]): ActiveBuffState[] {
  return activeBuffs.filter((buff) => {
    const roundsOk = buff.remainingRounds === null || buff.remainingRounds > 0;
    const chargesOk = buff.charges > 0;
    return roundsOk && chargesOk;
  });
}

export const useGameStore = create<GameState>((set, get) => ({
  isRunning: false,
  tutorialMode: false,
  floor: 0,
  energy: MAX_ENERGY_BASE,
  maxEnergy: MAX_ENERGY_BASE,
  atk: 1,
  treasureScore: 0,
  coinsCollected: 0,
  orbsCollected: 0,
  goldenTicketsCollected: 0,
  turnPhase: TurnPhase.PLAYER_INPUT,

  buildTiers: { attack: 0, defense: 0, utility: 0 },
  activeBuffs: [],
  upgradeHistory: [],
  damageTakenPool: 0,

  enemiesRemaining: 0,
  enemiesKilled: 0,
  bossesKilled: 0,
  chestsOpened: 0,
  trapsTriggered: 0,
  poisonTurns: 0,
  keysUsed: 1,
  upgradesGiven: 0,
  upgradeScreenFloor: null,
  rerollCount: 0,
  gameOverData: null,
  lootPhase: null,
  runEndActive: false,

  startRun: (keysUsed = 1, tutorialMode = false) =>
    set({
      isRunning: true,
      tutorialMode,
      floor: 1,
      energy: MAX_ENERGY_BASE,
      maxEnergy: MAX_ENERGY_BASE,
      atk: 1,
      treasureScore: 0,
      coinsCollected: 0,
      orbsCollected: 0,
      goldenTicketsCollected: 0,
      turnPhase: TurnPhase.PLAYER_INPUT,

      buildTiers: { attack: 0, defense: 0, utility: 0 },
      activeBuffs: [],
      upgradeHistory: [],
      damageTakenPool: 0,

      enemiesRemaining: 0,
      enemiesKilled: 0,
      bossesKilled: 0,
      chestsOpened: 0,
      trapsTriggered: 0,
      poisonTurns: 0,
      rerollCount: 0,
      upgradesGiven: 0,
      upgradeScreenFloor: null,
      gameOverData: null,
      lootPhase: null,
      keysUsed,
      runEndActive: false,
    }),

  endRun: () =>
    set({
      isRunning: false,
      tutorialMode: false,
      upgradeScreenFloor: null,
      gameOverData: null,
      lootPhase: null,
      runEndActive: false,
    }),

  nextFloor: () => set((s) => ({ floor: s.floor + 1 })),
  setFloor: (floor) => set({ floor: Math.max(1, floor) }),

  setEnergy: (e) =>
    set((s) => ({ energy: Math.min(s.maxEnergy, Math.max(0, e)) })),

  setMaxEnergy: (e) => set({ maxEnergy: e }),

  setAtk: (a) => set({ atk: a }),

  addTreasure: (type, value) =>
    set((s) => ({
      treasureScore: s.treasureScore + value,
      coinsCollected: s.coinsCollected + (type === "coin" ? value : 0),
      orbsCollected: s.orbsCollected + (type === "orb" ? value : 0),
      goldenTicketsCollected: s.goldenTicketsCollected + (type === "golden_ticket" ? value : 0),
    })),

  setTurnPhase: (phase) => set({ turnPhase: phase }),

  addUpgrade: (id) =>
    set((s) => {
      const def = UPGRADE_BY_ID[id];
      if (!def) return {};

      const nextState: Partial<GameState> = {};
      const history = [...s.upgradeHistory];

      if (def.kind === "evolution" && def.path && def.tier) {
        const lockedPath: EvolutionPath | null =
          s.buildTiers.attack > 0
            ? "attack"
            : s.buildTiers.defense > 0
              ? "defense"
              : s.buildTiers.utility > 0
                ? "utility"
                : null;
        if (lockedPath && def.path !== lockedPath) return {};

        const currentTier = s.buildTiers[def.path];
        // Tutorial can jump directly to a fixed tier pick (for onboarding flow).
        if (!s.tutorialMode && def.tier !== (currentTier + 1)) return {};
        if (def.tier <= currentTier) return {};

        const nextBuildTiers = { ...s.buildTiers, [def.path]: def.tier };
        nextState.buildTiers = nextBuildTiers;
        history.push(id);

        if (def.path === "utility") {
          const prevBonus = UTILITY_MAX_ENERGY_BY_TIER[currentTier];
          const nextBonus = UTILITY_MAX_ENERGY_BY_TIER[def.tier];
          const delta = nextBonus - prevBonus;
          if (delta > 0) {
            const nextMaxEnergy = s.maxEnergy + delta;
            nextState.maxEnergy = nextMaxEnergy;
            nextState.energy = Math.min(nextMaxEnergy, s.energy + delta);
          }
        }
      } else if (def.kind === "buff") {
        // No buff stacks in a run.
        if (s.upgradeHistory.includes(id)) return {};
        history.push(id);

        let nextEnergy = s.energy;
        if (def.instantHeal) {
          nextEnergy = Math.min(s.maxEnergy, nextEnergy + def.instantHeal);
          nextState.energy = nextEnergy;
        }

        const activeBuffs = [...s.activeBuffs];
        const hasDuration = def.durationRounds !== undefined;
        const hasCharges = !!def.freeMoves;
        const keepActive = hasDuration || hasCharges || def.id === "buff_golden_drift";

        if (keepActive) {
          activeBuffs.push({
            id: def.id as BuffId,
            remainingRounds: def.durationRounds ?? null,
            charges: def.freeMoves ?? Number.POSITIVE_INFINITY,
          });
          nextState.activeBuffs = normalizeActiveBuffs(activeBuffs);
        }
      }

      nextState.upgradeHistory = history;
      return nextState;
    }),

  advanceUpgradeRound: () =>
    set((s) => {
      if (s.activeBuffs.length === 0) return {};
      const next = s.activeBuffs.map((buff) => {
        if (buff.remainingRounds === null) return buff;
        return { ...buff, remainingRounds: buff.remainingRounds - 1 };
      });
      return { activeBuffs: normalizeActiveBuffs(next) };
    }),

  getBuildTier: (path) => get().buildTiers[path],

  getBuildUpgradeIds: () => {
    const build = get().buildTiers;
    const ids: UpgradeId[] = [];
    const attackId = getEvolutionId("attack", build.attack);
    const defenseId = getEvolutionId("defense", build.defense);
    const utilityId = getEvolutionId("utility", build.utility);
    if (attackId) ids.push(attackId);
    if (defenseId) ids.push(defenseId);
    if (utilityId) ids.push(utilityId);
    return ids;
  },

  getActiveBuffIds: () => {
    const ids: BuffId[] = [];
    const seen = new Set<string>();
    for (const buff of get().activeBuffs) {
      if (seen.has(buff.id)) continue;
      seen.add(buff.id);
      ids.push(buff.id);
    }
    return ids;
  },

  hasActiveBuff: (id) => get().activeBuffs.some((buff) => buff.id === id),

  getAttackBonus: () => {
    const s = get();
    const buildBonus = ATTACK_BONUS_BY_TIER[s.buildTiers.attack];
    const execBonus = s.activeBuffs.some((buff) => buff.id === "buff_execution_swing") ? 1 : 0;
    return buildBonus + execBonus;
  },

  getDamageReduction: () => DEFENSE_REDUCTION_BY_TIER[get().buildTiers.defense],

  getCritChance: () => {
    const s = get();
    const base = s.buildTiers.attack >= 3 ? 0.2 : 0;
    const buff = s.activeBuffs.some((b) => b.id === "buff_keen_edge") ? 0.1 : 0;
    return Math.min(0.95, base + buff);
  },

  getDodgeChance: () => DEFENSE_DODGE_BY_TIER[get().buildTiers.defense],

  getRegenOnKillChance: () => UTILITY_REGEN_CHANCE_BY_TIER[get().buildTiers.utility],

  getLootMagnetRadius: () => (get().activeBuffs.some((buff) => buff.id === "buff_loot_magnet") ? 2 : 0),

  getLootMultiplier: (type) => {
    if (type !== "coin" && type !== "orb") return 1;
    return get().activeBuffs.some((buff) => buff.id === "buff_treasure_window") ? 2 : 1;
  },

  getExtraDropChance: () => {
    const state = get();
    if (state.activeBuffs.some((buff) => buff.id === "buff_golden_drift")) return 0.2;
    return 0;
  },

  consumeFreeMove: () => {
    let consumed = false;
    set((s) => {
      const idx = s.activeBuffs.findIndex(
        (buff) => FREE_MOVE_BUFFS.includes(buff.id) && Number.isFinite(buff.charges) && buff.charges > 0,
      );
      if (idx === -1) return {};

      const next = [...s.activeBuffs];
      const buff = { ...next[idx] };
      buff.charges -= 1;
      next[idx] = buff;
      consumed = true;
      return { activeBuffs: normalizeActiveBuffs(next) };
    });
    return consumed;
  },

  recordDamageTaken: (amount) => {
    if (amount <= 0) return;
    set((s) => ({ damageTakenPool: s.damageTakenPool + amount }));
  },

  consumeDamageTakenPool: () => {
    const pool = get().damageTakenPool;
    set({ damageTakenPool: 0 });
    return pool;
  },

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

  showGameOver: (data) => set({ gameOverData: data, lootPhase: "summary", runEndActive: false }),
  hideGameOver: () => set({ gameOverData: null, lootPhase: null, runEndActive: false }),

  startLootReveal: (data) => set({ gameOverData: data, lootPhase: "coins", runEndActive: false }),
  advanceLootPhase: () => {
    const phase = get().lootPhase;
    if (phase === "coins") set({ lootPhase: "orbs" });
    else if (phase === "orbs") set({ lootPhase: "summary" });
  },

  setRunEndActive: (active) => set({ runEndActive: active }),

  spendCoins: (amount) =>
    set((s) => ({ coinsCollected: Math.max(0, s.coinsCollected - amount) })),

  incrementReroll: () => set((s) => ({ rerollCount: s.rerollCount + 1 })),

  getRerollCost: () => {
    const n = get().rerollCount;
    if (n === 0) return 10;
    if (n === 1) return 20;
    let a = 10;
    let b = 20;
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
      upgradesTaken: s.upgradeHistory,
    };
  },
}));
