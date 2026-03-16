"use client";

import { useLobbyStore } from "@/stores/lobbyStore";
import { useWalletStore } from "@/stores/walletStore";
import { useGameStore } from "@/stores/gameStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { OverlayFrame } from "@/components/OverlayFrame";
import { useEffect, useMemo, useRef, useState } from "react";

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function ChatInputBar({
  value,
  onChange,
  onSend,
  onFocus,
  onBlur,
}: {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <OverlayFrame
      className="h-9 w-full"
      contentClassName="h-full w-full !p-0"
      namePrefix="square"
      basePath="/sprites/ui/square_tileset"
      edge={16}
      innerEdge={16}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 50))}
        onKeyDown={(e) => e.key === "Enter" && onSend()}
        onFocus={() => {
          setIsFocused(true);
          onFocus();
        }}
        onBlur={() => {
          setIsFocused(false);
          onBlur();
        }}
        placeholder={isFocused ? "" : "TYPE A MESSAGE..."}
        className="h-full w-full bg-transparent border-0 outline-none px-2 font-press-start text-[7px] leading-none text-white placeholder:text-white/70"
      />
    </OverlayFrame>
  );
}

/**
 * Pixel-art chat panel:
 * - Uses same frame/fill assets as overlays
 * - Message stream starts at the bottom and grows upward
 * - Input bar uses overlay_text_l/m/r assets
 */
export function ChatSidebar() {
  const { chatMessages, addChatMessage } = useLobbyStore();
  const view = useWalletStore((s) => s.view);
  const upgradeScreenFloor = useGameStore((s) => s.upgradeScreenFloor);
  const gameOverData = useGameStore((s) => s.gameOverData);
  const lootPhase = useGameStore((s) => s.lootPhase);
  const runEndActive = useGameStore((s) => s.runEndActive);
  const settingsOpen = useSettingsStore((s) => s.isOpen);
  const [input, setInput] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  const newestFirst = useMemo(() => [...chatMessages].reverse(), [chatMessages]);
  const endRunOverlayVisible = runEndActive || gameOverData !== null || lootPhase !== null;
  const showMobileGameChat = view === "game" && upgradeScreenFloor === null && !endRunOverlayVisible && !settingsOpen;

  useEffect(() => {
    // In column-reverse, "bottom" sits at scrollTop = 0.
    if (messagesRef.current) messagesRef.current.scrollTop = 0;
  }, [chatMessages.length]);

  useEffect(() => {
    if (!showMobileGameChat && mobileOpen) {
      handleInputBlur();
      setMobileOpen(false);
    }
  }, [showMobileGameChat, mobileOpen]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    addChatMessage({
      sender: "You",
      senderColor: "#6fb6ff",
      message: text,
    });
    setInput("");
  }

  function handleInputFocus() {
    window.dispatchEvent(new Event("sova:chat-focus"));
  }

  function handleInputBlur() {
    window.dispatchEvent(new Event("sova:chat-blur"));
  }

  return (
    <>
      <div className="hidden md:flex h-full w-[28%] min-w-[300px] max-w-[420px] shrink-0">
        <OverlayFrame
          className="h-full w-full"
          contentClassName="h-full w-full flex flex-col"
          edge={48}
        >
          <div className="relative h-full w-full px-2 pt-2 pb-1 bg-[#3d4139]">
            <img
              src="/sprites/ui/overlay/overlay_chat_title_01.png"
              alt="Chat"
              className="absolute left-1/2 top-0 z-20 h-12 w-[144px] -translate-x-1/2 -translate-y-[72%]"
              style={{ imageRendering: "pixelated" }}
            />

            <div
              ref={messagesRef}
              className="h-full w-full overflow-y-auto scrollbar-hidden pt-4 pb-12"
            >
              <div className="min-h-full flex flex-col-reverse gap-2">
                {newestFirst.length === 0 && null}

                {newestFirst.map((msg) => (
                  <div key={msg.id}>
                    {msg.isSystem ? (
                      <p className="font-press-start text-[7px] leading-relaxed text-amber-300/90">
                        {msg.message}
                      </p>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span
                            className="font-pixel text-[8px] uppercase"
                            style={{ color: msg.senderColor }}
                          >
                            {msg.sender}
                          </span>
                          <span className="font-press-start text-[7px] text-white/50">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                        <p className="font-press-start text-[7px] leading-relaxed text-white/90 break-words">
                          {msg.message}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute left-0 right-0 bottom-0">
              <ChatInputBar
                value={input}
                onChange={setInput}
                onSend={handleSend}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
          </div>
        </OverlayFrame>
      </div>

      {showMobileGameChat && (
        <div className="md:hidden fixed left-8 z-[90] pointer-events-auto" style={{ bottom: "max(env(safe-area-inset-bottom), 2rem)" }}>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="relative w-10 h-10 flex items-center justify-center"
            aria-label="Open chat"
          >
            <img
              src="/sprites/ui/onboarding/buttons_square_01.png"
              alt=""
              className="absolute inset-0 w-full h-full"
              style={{ imageRendering: "pixelated" }}
            />
            <span className="relative z-10 font-press-start text-[7px] text-white/90 leading-none">C</span>
          </button>
        </div>
      )}

      {showMobileGameChat && mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[115] pointer-events-auto" onClick={() => { handleInputBlur(); setMobileOpen(false); }}>
          <div className="absolute inset-0 bg-black/72 backdrop-blur-[2px]" />
          <div className="absolute left-2 top-2 bottom-2 w-[min(88vw,360px)]" onClick={(e) => e.stopPropagation()}>
            <OverlayFrame
              className="h-full w-full"
              contentClassName="h-full w-full flex flex-col"
              edge={48}
            >
              <div className="relative h-full w-full px-2 pt-2 pb-1 bg-[#3d4139]">
                <img
                  src="/sprites/ui/overlay/overlay_chat_title_01.png"
                  alt="Chat"
                  className="absolute left-1/2 top-0 z-20 h-12 w-[144px] -translate-x-1/2 -translate-y-[72%]"
                  style={{ imageRendering: "pixelated" }}
                />

                <div className="h-full w-full overflow-y-auto scrollbar-hidden pt-4 pb-12">
                  <div className="min-h-full flex flex-col-reverse gap-2">
                    {newestFirst.length === 0 && null}

                    {newestFirst.map((msg) => (
                      <div key={`mobile-${msg.id}`}>
                        {msg.isSystem ? (
                          <p className="font-press-start text-[7px] leading-relaxed text-amber-300/90">
                            {msg.message}
                          </p>
                        ) : (
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span
                                className="font-pixel text-[8px] uppercase"
                                style={{ color: msg.senderColor }}
                              >
                                {msg.sender}
                              </span>
                              <span className="font-press-start text-[7px] text-white/50">
                                {formatTime(msg.timestamp)}
                              </span>
                            </div>
                            <p className="font-press-start text-[7px] leading-relaxed text-white/90 break-words">
                              {msg.message}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="absolute left-0 right-0 bottom-0">
                  <ChatInputBar
                    value={input}
                    onChange={setInput}
                    onSend={handleSend}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>
              </div>
            </OverlayFrame>
          </div>
        </div>
      )}
    </>
  );
}
