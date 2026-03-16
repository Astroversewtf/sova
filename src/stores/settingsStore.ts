import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

export type ControlAction =
  | "moveUp"
  | "moveDown"
  | "moveLeft"
  | "moveRight"
  | "skipTurn"
  | "mute";

export type ControlBindings = Record<ControlAction, string[]>;

export const DEFAULT_CONTROL_BINDINGS: ControlBindings = {
  moveUp: ["UP", "W"],
  moveDown: ["DOWN", "S"],
  moveLeft: ["LEFT", "A"],
  moveRight: ["RIGHT", "D"],
  skipTurn: ["SPACE"],
  mute: ["M"],
};

interface SettingsState {
  isOpen: boolean;
  muteAll: boolean;
  musicVolume: number;
  sfxVolume: number;
  controlsExpanded: boolean;
  bindings: ControlBindings;
  open: () => void;
  close: () => void;
  toggleOpen: () => void;
  setMuteAll: (value: boolean) => void;
  toggleMuteAll: () => void;
  setMusicVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
  setControlsExpanded: (expanded: boolean) => void;
  setBinding: (action: ControlAction, slot: number, key: string) => void;
  resetBindings: () => void;
}

function clampPct(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sanitizeBindings(raw: unknown): ControlBindings {
  if (!raw || typeof raw !== "object") return DEFAULT_CONTROL_BINDINGS;
  const obj = raw as Partial<Record<ControlAction, unknown>>;
  const out: Partial<ControlBindings> = {};

  (Object.keys(DEFAULT_CONTROL_BINDINGS) as ControlAction[]).forEach((key) => {
    const value = obj[key];
    if (!Array.isArray(value)) {
      out[key] = [...DEFAULT_CONTROL_BINDINGS[key]];
      return;
    }
    const normalized = value
      .map((v) => String(v).trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 2);
    out[key] = normalized.length > 0 ? normalized : [...DEFAULT_CONTROL_BINDINGS[key]];
  });

  return out as ControlBindings;
}

const memoryStorage = new Map<string, string>();
const safeStorage: StateStorage = {
  getItem: (name) => memoryStorage.get(name) ?? null,
  setItem: (name, value) => {
    memoryStorage.set(name, value);
  },
  removeItem: (name) => {
    memoryStorage.delete(name);
  },
};

function getSettingsStorage(): StateStorage {
  if (typeof window === "undefined") return safeStorage;
  try {
    const testKey = "__sova_settings_probe__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return safeStorage;
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isOpen: false,
      muteAll: false,
      musicVolume: 70,
      sfxVolume: 100,
      controlsExpanded: false,
      bindings: DEFAULT_CONTROL_BINDINGS,

      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),

      setMuteAll: (value) => set({ muteAll: value }),
      toggleMuteAll: () => set((s) => ({ muteAll: !s.muteAll })),

      setMusicVolume: (value) => set({ musicVolume: clampPct(value) }),
      setSfxVolume: (value) => set({ sfxVolume: clampPct(value) }),

      setControlsExpanded: (expanded) => set({ controlsExpanded: expanded }),

      setBinding: (action, slot, key) =>
        set((s) => {
          const normalized = key.trim().toUpperCase();
          if (!normalized) return s;

          const existing = s.bindings[action] ?? [];
          const next = existing.filter((k) => k !== normalized);
          while (next.length <= slot) next.push("");
          next[slot] = normalized;

          return {
            bindings: {
              ...s.bindings,
              [action]: next.filter(Boolean).slice(0, 2),
            },
          };
        }),

      resetBindings: () => set({ bindings: DEFAULT_CONTROL_BINDINGS }),
    }),
    {
      name: "sova-settings-v1",
      storage: createJSONStorage(getSettingsStorage),
      merge: (persistedState, currentState) => {
        const raw = (persistedState ?? {}) as Partial<SettingsState>;
        return {
          ...currentState,
          muteAll: Boolean(raw.muteAll),
          musicVolume: clampPct(Number(raw.musicVolume ?? currentState.musicVolume)),
          sfxVolume: clampPct(Number(raw.sfxVolume ?? currentState.sfxVolume)),
          controlsExpanded: Boolean(raw.controlsExpanded),
          bindings: sanitizeBindings(raw.bindings),
        };
      },
      partialize: (state) => ({
        muteAll: state.muteAll,
        musicVolume: state.musicVolume,
        sfxVolume: state.sfxVolume,
        controlsExpanded: state.controlsExpanded,
        bindings: state.bindings,
      }),
    },
  ),
);
