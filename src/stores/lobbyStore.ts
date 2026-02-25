import { create } from "zustand";

export type LobbyTab = "home" | "shop" | "quests" | "rankings" | "stash";
export type StashSubTab = "earnings" | "skins" | "items";
export type RankingsSubTab = "weekly" | "best";

export interface ChatMessage {
  id: string;
  sender: string;
  senderColor: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
}

interface LobbyState {
  activeTab: LobbyTab;
  activeStashSubTab: StashSubTab;
  activeRankingsSubTab: RankingsSubTab;
  chatMessages: ChatMessage[];
  setActiveTab: (tab: LobbyTab) => void;
  setStashSubTab: (tab: StashSubTab) => void;
  setRankingsSubTab: (tab: RankingsSubTab) => void;
  addChatMessage: (msg: Omit<ChatMessage, "id" | "timestamp">) => void;
}

export const useLobbyStore = create<LobbyState>((set) => ({
  activeTab: "home",
  activeStashSubTab: "earnings",
  activeRankingsSubTab: "weekly",
  chatMessages: [],
  setActiveTab: (tab) => set({ activeTab: tab }),
  setStashSubTab: (tab) => set({ activeStashSubTab: tab }),
  setRankingsSubTab: (tab) => set({ activeRankingsSubTab: tab }),
  addChatMessage: (msg) =>
    set((s) => ({
      chatMessages: [
        ...s.chatMessages,
        { ...msg, id: crypto.randomUUID(), timestamp: Date.now() },
      ],
    })),
}));
