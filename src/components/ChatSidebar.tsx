"use client";

import { useLobbyStore } from "@/stores/lobbyStore";
import { useRef, useEffect, useState } from "react";

function formatTime(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * Chat sidebar:
 * - Desktop (md+): permanent dark sidebar, always visible
 * - Mobile (<md): floating icon + slide-out overlay
 */
export function ChatSidebar() {
  const { chatMessages, addChatMessage } = useLobbyStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, mobileOpen]);

  // Fire focus/blur for Phaser keyboard capture (mobile overlay only)
  useEffect(() => {
    if (mobileOpen) {
      window.dispatchEvent(new Event("sova:chat-focus"));
    } else {
      window.dispatchEvent(new Event("sova:chat-blur"));
    }
  }, [mobileOpen]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    addChatMessage({
      sender: "You",
      senderColor: "#b8e550",
      message: text,
    });
    setInput("");
  }

  function handleInputFocus() {
    window.dispatchEvent(new Event("sova:chat-focus"));
  }

  function handleInputBlur() {
    if (!mobileOpen) {
      window.dispatchEvent(new Event("sova:chat-blur"));
    }
  }

  const chatPanel = (
    <>
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
        <span className="font-pixel text-sm text-gray-200 uppercase">
          Chat
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-pixel text-green-400">
              CONNECTED
            </span>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setMobileOpen(false)}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1 md:hidden"
            aria-label="Close chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {chatMessages.length === 0 && (
          <div className="text-center py-8">
            <span className="font-pixel text-[9px] text-gray-600">
              NO MESSAGES YET
            </span>
          </div>
        )}
        {chatMessages.map((msg) => (
          <div key={msg.id}>
            {msg.isSystem ? (
              <div className="text-amber-400/80 font-pixel text-[10px] italic py-1 border-y border-amber-900/40">
                {msg.message}
              </div>
            ) : (
              <div>
                <div className="flex items-baseline gap-2">
                  <span
                    className="font-pixel text-[10px] font-bold uppercase"
                    style={{ color: msg.senderColor }}
                  >
                    {msg.sender}
                  </span>
                  <span className="text-[9px] text-gray-500">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <p className="font-pixel text-gray-300 text-[9px] leading-relaxed mt-0.5">
                  {msg.message}
                </p>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 shrink-0">
        <div className="flex items-center bg-[#0d1520] border border-gray-700 rounded-lg overflow-hidden focus-within:border-gray-500">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 200))}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="TYPE A MESSAGE..."
            className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[9px] text-gray-200 placeholder-gray-600 outline-none font-pixel"
          />
          <button
            onClick={handleSend}
            className="bg-gray-700 hover:bg-gray-600 text-white font-pixel text-[9px] px-3 py-2.5 transition-colors shrink-0"
          >
            SEND
          </button>
        </div>
        <div className="text-right mt-1">
          <span className="text-[9px] font-pixel text-gray-600">{input.length}/200</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop: permanent sidebar ── */}
      <div className="hidden md:flex w-[22%] bg-gradient-to-b from-[#0f1923] via-[#111d2b] to-[#0c1620] border-r border-white/10 flex-col shrink-0 h-full">
        {chatPanel}
      </div>

      {/* ── Mobile: floating icon ── */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden fixed bottom-5 left-5 z-50 w-12 h-12 rounded-full bg-gray-800 border border-gray-600 shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors active:scale-95"
          aria-label="Open chat"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-200">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {chatMessages.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800" />
          )}
        </button>
      )}

      {/* ── Mobile: backdrop ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile: slide-out panel ── */}
      <div
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-gradient-to-b from-[#0f1923] via-[#111d2b] to-[#0c1620] border-r border-white/10 flex flex-col shadow-2xl transition-transform duration-200 ease-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {chatPanel}
      </div>
    </>
  );
}
