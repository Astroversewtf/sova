"use client";

import { useEffect, useState } from "react";
import { useLogout } from "@privy-io/react-auth";
import { useWalletStore } from "@/stores/walletStore";
import {
  type ControlAction,
  DEFAULT_CONTROL_BINDINGS,
  useSettingsStore,
} from "@/stores/settingsStore";

const CONTROL_ROWS: Array<{ action: ControlAction; label: string; hasSecondary: boolean }> = [
  { action: "moveUp", label: "MOVE UP", hasSecondary: true },
  { action: "moveDown", label: "MOVE DOWN", hasSecondary: true },
  { action: "moveLeft", label: "MOVE LEFT", hasSecondary: true },
  { action: "moveRight", label: "MOVE RIGHT", hasSecondary: true },
  { action: "skipTurn", label: "SKIP TURN", hasSecondary: false },
  { action: "mute", label: "MUTE", hasSecondary: false },
];

function bindingLabel(binding: string) {
  switch (binding) {
    case "UP": return "↑";
    case "DOWN": return "↓";
    case "LEFT": return "←";
    case "RIGHT": return "→";
    case "SPACE": return "Space";
    default: return binding;
  }
}

function normalizeBindingKey(e: KeyboardEvent): string | null {
  if (e.key === " ") return "SPACE";
  if (e.key.startsWith("Arrow")) return e.key.slice(5).toUpperCase();
  if (/^[a-zA-Z]$/.test(e.key)) return e.key.toUpperCase();
  return null;
}

export function SettingsOverlay() {
  const isOpen = useSettingsStore((s) => s.isOpen);
  const muteAll = useSettingsStore((s) => s.muteAll);
  const musicVolume = useSettingsStore((s) => s.musicVolume);
  const sfxVolume = useSettingsStore((s) => s.sfxVolume);
  const controlsExpanded = useSettingsStore((s) => s.controlsExpanded);
  const bindings = useSettingsStore((s) => s.bindings);
  const open = useSettingsStore((s) => s.open);
  const close = useSettingsStore((s) => s.close);
  const setMuteAll = useSettingsStore((s) => s.setMuteAll);
  const setMusicVolume = useSettingsStore((s) => s.setMusicVolume);
  const setSfxVolume = useSettingsStore((s) => s.setSfxVolume);
  const setControlsExpanded = useSettingsStore((s) => s.setControlsExpanded);
  const setBinding = useSettingsStore((s) => s.setBinding);
  const resetBindings = useSettingsStore((s) => s.resetBindings);

  const walletAddress = useWalletStore((s) => s.address);
  const walletDisconnect = useWalletStore((s) => s.disconnect);
  const { logout } = useLogout();
  const [bindingCapture, setBindingCapture] = useState<{
    action: ControlAction;
    slot: number;
  } | null>(null);

  useEffect(() => {
    window.dispatchEvent(new Event("sova:controls-updated"));
  }, [bindings]);

  useEffect(() => {
    if (!isOpen) {
      setBindingCapture(null);
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (bindingCapture) setBindingCapture(null);
        else close();
        return;
      }

      if (!bindingCapture) return;

      const key = normalizeBindingKey(e);
      if (!key) return;

      e.preventDefault();
      e.stopPropagation();
      setBinding(bindingCapture.action, bindingCapture.slot, key);
      setBindingCapture(null);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [bindingCapture, close, isOpen, setBinding]);

  async function handleSignOut() {
    try {
      await logout();
    } finally {
      walletDisconnect();
    }
  }

  const shortWallet = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "0x------";
  const profileName = walletAddress ? `PLAYER ${walletAddress.slice(2, 6).toUpperCase()}` : "SOVA PLAYER";
  const muteKey = bindings.mute[0] ?? DEFAULT_CONTROL_BINDINGS.mute[0];

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[90] pointer-events-auto">
        <button
          type="button"
          onClick={open}
          className="w-14 h-14 rounded-xl border border-white/20 bg-[#171a22]/90 hover:bg-[#1d2230] transition-colors shadow-[0_10px_25px_rgba(0,0,0,0.35)] flex items-center justify-center"
          aria-label="Open settings"
        >
          <div className="flex flex-col gap-1">
            <span className="block w-6 h-[3px] rounded bg-[#dfe3ea]" />
            <span className="block w-6 h-[3px] rounded bg-[#dfe3ea]" />
            <span className="block w-6 h-[3px] rounded bg-[#dfe3ea]" />
          </div>
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[120] pointer-events-auto bg-black/72 backdrop-blur-[3px] flex items-center justify-center px-4 py-6">
          <div className="w-full max-w-[560px] rounded-[20px] border border-white/40 bg-[linear-gradient(180deg,rgba(26,28,33,0.96),rgba(16,18,23,0.97))] shadow-[0_30px_80px_rgba(0,0,0,0.5)] p-5 sm:p-6">
            <div className="flex items-center justify-center relative mb-5">
              <h2 className="font-pixel text-[22px] text-white tracking-wide">SETTINGS</h2>
              <button
                type="button"
                onClick={close}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-white/90 hover:text-white text-2xl leading-none"
                aria-label="Close settings"
              >
                ×
              </button>
            </div>

            <button
              type="button"
              onClick={() => setMuteAll(!muteAll)}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 flex items-center justify-between hover:bg-white/10 transition-colors"
            >
              <span className="font-pixel text-[13px] text-white/95">🔊 MUTE ALL</span>
              <span className="font-pixel text-[11px] text-white/45">[{bindingLabel(muteKey)}]</span>
            </button>

            <div className="mt-5 flex flex-col items-center gap-4">
              <div className="w-full max-w-[420px]">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="font-pixel text-[13px] text-white">MUSIC</span>
                  <span className="font-pixel text-[12px] text-[#b8e550]">{musicVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                  className="w-full accent-[#b8e550]"
                />
              </div>

              <div className="w-full max-w-[420px]">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="font-pixel text-[13px] text-white">SOUND EFFECTS</span>
                  <span className="font-pixel text-[12px] text-[#b8e550]">{sfxVolume}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(Number(e.target.value))}
                  className="w-full accent-[#b8e550]"
                />
              </div>
            </div>

            <div className="my-5 h-px bg-white/10" />

            <button
              type="button"
              onClick={() => setControlsExpanded(!controlsExpanded)}
              className="w-full flex items-center justify-center gap-3"
            >
              <span className="font-pixel text-[13px] text-white">CONTROLS</span>
              <span className={`text-xl text-white/80 transition-transform ${controlsExpanded ? "rotate-180" : ""}`}>▼</span>
            </button>

            {controlsExpanded && (
              <div className="mt-4 space-y-3 flex flex-col items-center">
                {CONTROL_ROWS.map((row) => {
                  const rowBindings = bindings[row.action] ?? [];
                  const first = rowBindings[0] ?? "";
                  const second = row.hasSecondary ? (rowBindings[1] ?? "") : "";

                  return (
                    <div key={row.action} className="w-full max-w-[460px] flex items-center justify-center gap-3">
                      <span className="font-pixel text-[11px] text-white/95 w-[120px] text-center">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBindingCapture({ action: row.action, slot: 0 })}
                          className="min-w-[42px] h-8 rounded-md border border-white/10 bg-white/8 px-2 font-pixel text-[11px] text-white/90 hover:bg-white/12"
                        >
                          {bindingCapture?.action === row.action && bindingCapture.slot === 0 ? "..." : (first ? bindingLabel(first) : "-")}
                        </button>
                        {row.hasSecondary && (
                          <button
                            type="button"
                            onClick={() => setBindingCapture({ action: row.action, slot: 1 })}
                            className="min-w-[42px] h-8 rounded-md border border-white/10 bg-white/8 px-2 font-pixel text-[11px] text-white/90 hover:bg-white/12"
                          >
                            {bindingCapture?.action === row.action && bindingCapture.slot === 1 ? "..." : (second ? bindingLabel(second) : "-")}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setBindingCapture({ action: row.action, slot: row.hasSecondary ? 1 : 0 })}
                          className="w-8 h-8 rounded-md border border-white/10 bg-white/5 font-pixel text-[12px] text-white/90 hover:bg-white/12"
                          aria-label={`Set key for ${row.label}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={resetBindings}
                  className="w-full max-w-[460px] mt-2 h-9 rounded-xl border border-white/12 bg-transparent hover:bg-white/5 transition-colors font-pixel text-[11px] text-white/70"
                >
                  RESET TO DEFAULTS
                </button>
                {bindingCapture && (
                  <p className="font-pixel text-[11px] text-[#b8e550] text-center">
                    PRESS A KEY...
                  </p>
                )}
              </div>
            )}

            <div className="my-5 h-px bg-white/10" />

            <div className="flex items-center justify-center mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-[#ffdf8f] bg-[#252116] flex items-center justify-center">
                  <img
                    src="/sprites/player/idle/astro_idle_front_01.png"
                    alt=""
                    className="w-9 h-9"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
                <div>
                  <div className="font-pixel text-[12px] text-white">{profileName}</div>
                  <div className="font-pixel text-[11px] text-white/45">{shortWallet}</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full h-11 rounded-xl border border-red-500/55 bg-[rgba(86,27,30,0.35)] hover:bg-[rgba(116,33,36,0.45)] transition-colors font-pixel text-[13px] text-[#f06a6a]"
            >
              SIGN OUT
            </button>
          </div>
        </div>
      )}
    </>
  );
}
