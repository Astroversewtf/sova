import { create } from "zustand";
import { createUser, updateUser } from "@/lib/firestore";

export interface LeaderboardEntry {
  rank: number;
  player: string;
  score: number;
  coins: number;
  gems: number;
  keys: number;
}

interface PlayerState {
  walletAddress: string | null;
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
  loadFromDB: (wallet: string) => Promise<void>;
  addCoins: (amount: number) => void;
  addGems: (amount: number) => void;
  addKeys: (amount: number) => void;
  addTickets: (amount: number) => void;
  setAvaxBalance: (balance: number) => void;
  resetWeekly: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  walletAddress: null,
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

  loadFromDB: async (wallet) => {
    const user = await createUser(wallet);
    set({
      walletAddress: wallet,
      coins: user.coins,
      gems: user.gems,
      keys: user.keys,
      goldenTickets: user.goldenTickets,
      totalEarnings: user.totalEarnings,
      weeklyEarnings: user.weeklyEarnings,
      jackpotEarnings: user.jackpotEarnings,
      bestScore: user.bestScore,
      weeklyScore: user.weeklyScore,
    });
  },

  addCoins: (amount) => {
    set((s) => ({ coins: s.coins + amount }));
    const wallet = get().walletAddress;
    if (wallet) updateUser(wallet, { coins: get().coins });
  },

  addGems: (amount) => {
    set((s) => ({ gems: s.gems + amount }));
    const wallet = get().walletAddress;
    if (wallet) updateUser(wallet, { gems: get().gems });
  },

  addKeys: (amount) => {
    set((s) => ({ keys: s.keys + amount }));
    const wallet = get().walletAddress;
    if (wallet) updateUser(wallet, { keys: get().keys });
  },

  addTickets: (amount) => {
    set((s) => ({ goldenTickets: s.goldenTickets + amount }));
    const wallet = get().walletAddress;
    if (wallet) updateUser(wallet, { goldenTickets: get().goldenTickets });
  },

  setAvaxBalance: (balance) => set({ avaxBalance: balance }),

  resetWeekly: () => {
    set({ weeklyScore: 0, weeklyEarnings: 0 });
    const wallet = get().walletAddress;
    if (wallet) updateUser(wallet, { weeklyScore: 0, weeklyEarnings: 0 });
  },
}));
