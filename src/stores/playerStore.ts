import { create } from "zustand";

export interface LeaderboardEntry {
  rank: number;
  player: string;
  score: number;
  coins: number;
  gems: number;
  keys: number;
}

interface PlayerState {
  coins: number;
  gems: number;
  keys: number;
  goldenTickets: number;
  avaxBalance: number;
  weeklyScore: number;
  bestScore: number;
  totalEarnings: number;
  weeklyEarnings: number;
  jackpotEarnings: number;
  leaderboard: LeaderboardEntry[];
  weeklyLeaderboard: LeaderboardEntry[];
  addCoins: (amount: number) => void;
  addGems: (amount: number) => void;
  addKeys: (amount: number) => void;
  addTickets: (amount: number) => void;
  setAvaxBalance: (balance: number) => void;
  resetWeekly: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  coins: 0,
  gems: 0,
  keys: 0,
  goldenTickets: 0,
  avaxBalance: 0,
  weeklyScore: 0,
  bestScore: 0,
  totalEarnings: 0,
  weeklyEarnings: 0,
  jackpotEarnings: 0,
  leaderboard: [],
  weeklyLeaderboard: [],
  addCoins: (amount) => set((s) => ({ coins: s.coins + amount })),
  addGems: (amount) => set((s) => ({ gems: s.gems + amount })),
  addKeys: (amount) => set((s) => ({ keys: s.keys + amount })),
  addTickets: (amount) => set((s) => ({ goldenTickets: s.goldenTickets + amount })),
  setAvaxBalance: (balance) => set({ avaxBalance: balance }),
  resetWeekly: () => set({ weeklyScore: 0, weeklyEarnings: 0 }),
}));
