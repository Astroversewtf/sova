"use client";

import { useEffect, useState } from "react";
import { useLogout, usePrivy } from "@privy-io/react-auth";
import { OverlayFrame } from "@/components/OverlayFrame";
import { useWalletStore } from "@/stores/walletStore";
import { useGameStore } from "@/stores/gameStore";
import {
  type ControlAction,
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
    case "SPACE": return "SPC";
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
  const view = useWalletStore((s) => s.view);
  const walletDisconnect = useWalletStore((s) => s.disconnect);
  const upgradeScreenFloor = useGameStore((s) => s.upgradeScreenFloor);
  const gameOverData = useGameStore((s) => s.gameOverData);
  const lootPhase = useGameStore((s) => s.lootPhase);
  const runEndActive = useGameStore((s) => s.runEndActive);
  const { logout } = useLogout();
  const { user } = usePrivy();
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

  const endRunOverlayVisible = runEndActive || gameOverData !== null || lootPhase !== null;

  useEffect(() => {
    if (endRunOverlayVisible && isOpen) {
      close();
    }
  }, [endRunOverlayVisible, isOpen, close]);

  async function handleSignOut() {
    close();
    try {
      await logout();
    } finally {
      walletDisconnect();
      close();
    }
  }

  const shortWallet = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : "0x------";
  const profileName = walletAddress ? `PLAYER ${walletAddress.slice(2, 6).toUpperCase()}` : "SOVA PLAYER";
  const defaultAvatar = "/images/FUD.png";
  const googleAvatar = ((user as any)?.google?.picture
    ?? (user as any)?.google?.profilePictureUrl
    ?? (user as any)?.google?.avatarUrl
    ?? null) as string | null;
  const walletAvatar = walletAddress
    ? `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(walletAddress)}`
    : null;
  const profileAvatar = googleAvatar || walletAvatar || defaultAvatar;

  return (
    <>
      {view === "game" && upgradeScreenFloor === null && !endRunOverlayVisible && (
        <div className="fixed bottom-4 right-8 z-[90] pointer-events-auto">
          <button
            type="button"
            onClick={open}
            className="relative w-10 h-10 flex items-center justify-center transition-transform hover:scale-[1.03] active:scale-[0.98]"
            aria-label="Open settings"
          >
            <img
              src="/sprites/ui/onboarding/buttons_menu_01.png"
              alt=""
              className="absolute inset-0 w-full h-full"
              style={{ imageRendering: "pixelated" }}
            />
          </button>
        </div>
      )}

      {isOpen && (
        <div
          className="settings-overlay fixed inset-0 z-[120] pointer-events-auto bg-black/72 backdrop-blur-[3px] flex items-center justify-center px-4 py-6"
          onClick={close}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <OverlayFrame
              className="w-[min(440px,88vw)] h-[min(540px,82dvh)]"
              contentClassName="flex h-full w-full flex-col"
              edge={64}
            >
              <div className="relative flex h-full w-full flex-col px-3 sm:px-4 py-2 bg-[#3d4139]">
                <img
                  src="/sprites/ui/onboarding/buttons_settings_01.png"
                  alt=""
                  className="absolute left-1/2 top-0 z-20 w-[min(220px,62%)] -translate-x-1/2 -translate-y-[78%] pointer-events-none"
                  style={{ imageRendering: "pixelated" }}
                />
                <div className="flex-1 overflow-y-auto scrollbar-hidden pt-5">
              <button
                type="button"
                onClick={() => setMuteAll(!muteAll)}
                className="relative mx-auto block w-[min(150px,46%)] aspect-[3/1]"
              >
                <img
                  src="/sprites/ui/lobby-buttons/buttons_muteall_01.png"
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              </button>

              <div className="mt-5 flex flex-col items-center gap-4">
                <div className="w-full max-w-[420px]">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="font-pixel text-[13px] text-white">MUSIC</span>
                    <span className="font-press-start text-[12px] text-[#6fb6ff]">{musicVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(Number(e.target.value))}
                    className="w-full accent-[#6fb6ff] bg-[#141e2b]"
                  />
                </div>

                <div className="w-full max-w-[420px]">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="font-pixel text-[13px] text-white">SOUND EFFECTS</span>
                    <span className="font-press-start text-[12px] text-[#6fb6ff]">{sfxVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={sfxVolume}
                    onChange={(e) => setSfxVolume(Number(e.target.value))}
                    className="w-full accent-[#6fb6ff] bg-[#141e2b]"
                  />
                </div>
              </div>

              <div className="my-5 h-px bg-[#2a3544]" />

              <button
                type="button"
                onClick={() => setControlsExpanded(!controlsExpanded)}
                className="w-full flex items-center justify-center gap-3"
              >
                <span className="font-pixel text-[13px] text-white">CONTROLS</span>
                <span className={`text-xl text-[#b9c9dc] transition-transform ${controlsExpanded ? "rotate-180" : ""}`}>▼</span>
              </button>

              {controlsExpanded && (
                <div className="mt-4 space-y-3 flex flex-col items-center">
                  {CONTROL_ROWS.map((row) => {
                    const rowBindings = bindings[row.action] ?? [];
                    const first = rowBindings[0] ?? "";
                    const second = row.hasSecondary ? (rowBindings[1] ?? "") : "";

                    return (
                      <div key={row.action} className="w-full max-w-[460px] flex items-center justify-center gap-3">
                        <span className="font-pixel text-[11px] text-white w-[120px] text-center">{row.label}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setBindingCapture({ action: row.action, slot: 0 })}
                            className="relative w-8 h-8 flex items-center justify-center"
                          >
                            <img
                              src="/sprites/ui/onboarding/square_button_01.png"
                              alt=""
                              className="absolute inset-0 w-full h-full"
                              style={{ imageRendering: "pixelated" }}
                            />
                            <span className="relative z-10 font-press-start text-[7px] text-white leading-none">
                              {bindingCapture?.action === row.action && bindingCapture.slot === 0 ? "..." : (first ? bindingLabel(first) : "-")}
                            </span>
                          </button>
                          {row.hasSecondary && (
                            <button
                              type="button"
                              onClick={() => setBindingCapture({ action: row.action, slot: 1 })}
                              className="relative w-8 h-8 flex items-center justify-center"
                            >
                              <img
                                src="/sprites/ui/onboarding/square_button_01.png"
                                alt=""
                                className="absolute inset-0 w-full h-full"
                                style={{ imageRendering: "pixelated" }}
                              />
                              <span className="relative z-10 font-press-start text-[7px] text-white leading-none">
                                {bindingCapture?.action === row.action && bindingCapture.slot === 1 ? "..." : (second ? bindingLabel(second) : "-")}
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setBindingCapture({ action: row.action, slot: row.hasSecondary ? 1 : 0 })}
                            className="relative w-8 h-8"
                            aria-label={`Set key for ${row.label}`}
                          >
                            <img
                              src="/sprites/ui/lobby-buttons/buttons_plus_01.png"
                              alt=""
                              className="absolute inset-0 w-full h-full"
                              style={{ imageRendering: "pixelated" }}
                            />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={resetBindings}
                    className="relative w-[min(220px,72%)] aspect-[3/1] mt-2"
                  >
                    <img
                      src="/sprites/ui/onboarding/buttons_empty_01.png"
                      alt=""
                      className="absolute inset-0 w-full h-full object-contain"
                      style={{ imageRendering: "pixelated" }}
                    />
                    <span className="relative z-10 -translate-y-[1px] font-press-start font-bold text-[9px] text-gray-300 leading-none">
                      RESET TO DEFAULTS
                    </span>
                  </button>
                  {bindingCapture && (
                    <p className="font-pixel text-[11px] text-[#6fb6ff] text-center">
                      PRESS A KEY...
                    </p>
                  )}
                </div>
              )}

              <div className="my-5 h-px bg-[#2a3544]" />

              <div className="flex items-center justify-center mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-md overflow-hidden bg-[#252116] flex items-center justify-center">
                      <img
                        src={profileAvatar}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.dataset.fallback === "1") return;
                          img.dataset.fallback = "1";
                          img.src = defaultAvatar;
                        }}
                      />
                    </div>
                    <img
                      src="/sprites/ui/settings/buttons_overlay_empty_02.png"
                      alt=""
                      className="absolute inset-0 z-10 w-full h-full scale-[1.08] pointer-events-none"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>
                  <div>
                    <div className="font-pixel text-[12px] text-white">{profileName}</div>
                    <div className="font-press-start text-[11px] text-[#8ea0b6]">{shortWallet}</div>
                  </div>
                </div>
              </div>

              <div className="w-full flex justify-center">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="relative block w-[min(142px,48%)] aspect-[2/1]"
                >
                  <img
                    src="/sprites/ui/lobby-buttons/buttons_logout_01.png"
                    alt=""
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ imageRendering: "pixelated" }}
                  />
                </button>
              </div>
                </div>
              </div>
            </OverlayFrame>
          </div>
        </div>
      )}
    </>
  );
}
