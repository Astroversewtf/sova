"use client";

import { useLobbyStore } from "@/stores/lobbyStore";
import { useRef, useEffect, useState } from "react";

export function ChatSidebar() {
  const { chatMessages, addChatMessage } = useLobbyStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    addChatMessage({
      sender: "You",
      senderColor: "#059669",
      message: text,
    });
    setInput("");
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="font-pixel text-sm text-gray-700 uppercase">
          Chat
        </span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-pixel text-green-500">
            CONNECTED
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {chatMessages.length === 0 && (
          <div className="text-center py-8">
            <span className="font-pixel text-[9px] text-gray-300">
              NO MESSAGES YET
            </span>
          </div>
        )}
        {chatMessages.map((msg) => (
          <div key={msg.id} className="text-xs">
            {msg.isSystem ? (
              <div className="text-amber-600/80 font-pixel text-[10px] italic py-1 border-y border-amber-200">
                {msg.message}
              </div>
            ) : (
              <div>
                <span
                  className="font-pixel text-[10px] font-bold"
                  style={{ color: msg.senderColor }}
                >
                  {msg.sender}:
                </span>{" "}
                <span className="text-gray-600 text-[11px]">
                  {msg.message}
                </span>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, 200))}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-white border border-gray-200 rounded px-2 py-1.5 text-[11px] text-gray-800 placeholder-gray-300 outline-none focus:border-gray-400 font-pixel"
          />
          <button
            onClick={handleSend}
            className="bg-gray-800 hover:bg-gray-700 text-white font-pixel text-[10px] px-3 py-1.5 rounded transition-colors"
          >
            SEND
          </button>
        </div>
        <div className="text-right mt-1">
          <span className="text-[9px] font-pixel text-gray-300">
            {input.length}/200
          </span>
        </div>
      </div>
    </div>
  );
}
