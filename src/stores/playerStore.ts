import { create } from "zustand";

function updateUser(address : string, data : Record<string, unknown>) {
  fetch("/api/user", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, ...data }),
  });
}

export interface LeaderboardEntry {
  rank: number;
  player: string;
  score: number;
  coins: number;
  orbs: number;
  keys: number;
}

interface PlayerState {
  walletAddress: string | null;
  coins: number;
  orbs: number;
  keys: number;
  gems: number;
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
  addOrbs: (amount: number) => void;
  addKeys: (amount: number) => void;
  addGems: (amount: number) => void;
  addTickets: (amount: number) => void;
  setAvaxBalance: (balance: number) => void;
  resetWeekly: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  walletAddress: null,
  coins: 0,
  orbs: 0,
  keys: 0,
  gems: 0,
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
    const res = await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: wallet }),
    });
    const user = await res.json();
    if (user) {
      set({
        walletAddress: wallet,
        coins: user.coins ?? 0,
        gems: user.gems ?? 0,
        keys: user.keys ?? 0,
        goldenTickets: user.goldenTickets ?? 0,
        totalEarnings: user.totalEarnings ?? 0,
        weeklyEarnings: user.weeklyEarnings ?? 0,
        jackpotEarnings: user.jackpotEarnings ?? 0,
        bestScore: user.bestScore ?? 0,
        weeklyScore: user.weeklyScore ?? 0,
      });
    }
  },

  addCoins: (amount) => {
    set((s) => ({ coins: s.coins + amount }));
    const wallet = get().walletAddress;
    if (wallet) updateUser(wallet, { coins: get().coins });
  },

  addOrbs: (amount) => {
    set((s) => ({ orbs: s.orbs + amount }));
    const wallet = get().walletAddress;
    if (wallet) updateUser(wallet, { gems: get().orbs });
  },

  addKeys: (amount) => {
    set((s) => ({ keys: s.keys + amount }));
    const wallet = get().walletAddress;
    if (wallet) updateUser(wallet, { keys: get().keys });
  },

  addGems: (amount) => {
    set((s) => ({ gems: s.gems + amount }));
    const wallet = get().walletAddress;
    if (wallet) updateUser(wallet, { gems: get().gems });
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
