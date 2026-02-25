import { create } from "zustand";

type SceneName = "loading" | "game" | "gameover";

interface GameState {
  currentScene: SceneName;
  score: number;
  floor: number;
  energy: number;
  maxEnergy: number;
  coins: number;
  isPlaying: boolean;
  timeElapsed: number;
  setScene: (scene: SceneName) => void;
  addScore: (amount: number) => void;
  addCoins: (amount: number) => void;
  nextFloor: () => void;
  drainEnergy: (amount: number) => void;
  setPlaying: (playing: boolean) => void;
  setTimeElapsed: (time: number) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentScene: "loading",
  score: 0,
  floor: 1,
  energy: 100,
  maxEnergy: 100,
  coins: 0,
  isPlaying: false,
  timeElapsed: 0,
  setScene: (scene) => set({ currentScene: scene }),
  addScore: (amount) => set((s) => ({ score: s.score + amount })),
  addCoins: (amount) => set((s) => ({ coins: s.coins + amount })),
  nextFloor: () => set((s) => ({ floor: s.floor + 1 })),
  drainEnergy: (amount) =>
    set((s) => ({ energy: Math.max(0, s.energy - amount) })),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setTimeElapsed: (time) => set({ timeElapsed: time }),
  resetGame: () =>
    set({
      currentScene: "loading",
      score: 0,
      floor: 1,
      energy: 100,
      coins: 0,
      isPlaying: false,
      timeElapsed: 0,
    }),
}));
