import { create } from "zustand";

export type AppView = "connect" | "lobby" | "game";

interface WalletState {
  address: string | null;
  chainId: number | null;
  connected: boolean;
  view: AppView;
  connect: (address: string, chainId: number) => void;
  disconnect: () => void;
  setChainId: (chainId: number) => void;
  setView: (view: AppView) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  chainId: null,
  connected: false,
  view: "connect",
  connect: (address, chainId) =>
    set({ address, chainId, connected: true, view: "lobby" }),
  disconnect: () =>
    set({ address: null, chainId: null, connected: false, view: "connect" }),
  setChainId: (chainId) => set({ chainId }),
  setView: (view) => set({ view }),
}));
