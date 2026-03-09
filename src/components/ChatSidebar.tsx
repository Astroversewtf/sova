"use client";

import { useLobbyStore } from "@/stores/lobbyStore";
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
  return (
    <div className="relative h-8 w-full">
      <img
        src="/sprites/ui/overlay/overlay_text_l_01.png"
        alt=""
        className="absolute left-0 top-0 h-8 w-8"
        style={{ imageRendering: "pixelated" }}
      />
      <div
        className="absolute left-8 right-8 top-0 h-8"
        style={{
          backgroundImage: "url('/sprites/ui/overlay/overlay_text_m_01.png')",
          backgroundRepeat: "repeat-x",
          backgroundSize: "32px 32px",
          imageRendering: "pixelated",
        }}
      />
      <img
        src="/sprites/ui/overlay/overlay_text_r_01.png"
        alt=""
        className="absolute right-0 top-0 h-8 w-8"
        style={{ imageRendering: "pixelated" }}
      />

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 50))}
        onKeyDown={(e) => e.key === "Enter" && onSend()}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="TYPE A MESSAGE..."
        className="absolute left-[29px] right-12 top-[27%] h-[14px] -translate-y-1/2 bg-transparent border-0 outline-none font-press-start text-[7px] leading-[14px] text-white placeholder:text-white/70"
      />
      <button
        type="button"
        onClick={onSend}
        className="absolute right-[7px] top-1/2 -translate-y-1/2 h-[14px] w-[14px] flex items-center justify-center font-pixel text-[11px] leading-none text-white/90"
        aria-label="Send message"
      >
        ›
      </button>
    </div>
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
  const [input, setInput] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);

  const newestFirst = useMemo(() => [...chatMessages].reverse(), [chatMessages]);

  useEffect(() => {
    // In column-reverse, "bottom" sits at scrollTop = 0.
    if (messagesRef.current) messagesRef.current.scrollTop = 0;
  }, [chatMessages.length]);

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
    <div className="hidden md:flex h-full w-[28%] min-w-[300px] max-w-[420px] shrink-0 p-3 items-center justify-center">
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

          <div className="absolute left-[-5px] right-[-5px] bottom-[-4px]">
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
  );
}
