"use client";

import { useChat } from "@livekit/components-react";
import { useState } from "react";
import { ChatIcon } from "./icons";

// Custom chat UI (rather than LiveKit's prebuilt <Chat>) so host messages
// can be visually highlighted — the prebuilt component only distinguishes
// "sent by me" vs "sent by someone else", not by role.
function ChatMessages() {
  const { chatMessages } = useChat();

  if (chatMessages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 text-center text-xs text-zinc-500">
        No messages yet. Say hello!
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2 overflow-y-auto p-3">
      {chatMessages.map((m) => {
        const isHost = m.from?.identity?.startsWith("host-") ?? false;
        const senderName = m.from?.name || m.from?.identity || "Unknown";
        return (
          <div
            key={m.id}
            className={`rounded-lg border px-3 py-2 ${
              isHost
                ? "border-indigo-400/30 bg-indigo-500/15"
                : "border-transparent bg-white/5"
            }`}
          >
            <div className="mb-0.5 flex items-center gap-1.5">
              <span
                className={`text-xs font-medium ${isHost ? "text-indigo-300" : "text-zinc-300"}`}
              >
                {senderName}
              </span>
              {isHost && (
                <span className="rounded bg-indigo-500/30 px-1.5 py-0.5 text-[10px] font-medium text-indigo-200">
                  Host
                </span>
              )}
              <span className="ml-auto text-[10px] text-zinc-500">
                {new Date(m.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="break-words text-sm text-white">{m.message}</p>
          </div>
        );
      })}
    </div>
  );
}

function ChatComposer() {
  const { send, isSending } = useChat();
  const [text, setText] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    send(trimmed).catch(() => {});
    setText("");
  };

  return (
    <form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-3">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter a message..."
        className="h-9 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-indigo-400"
      />
      <button
        type="submit"
        disabled={isSending || !text.trim()}
        className="rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        Send
      </button>
    </form>
  );
}

// Full-screen overlay on mobile (there's no room to split the screen with
// a usable video), a fixed-width side panel on larger screens where both
// can fit side by side.
export function ChatPanel() {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-zinc-950 sm:static sm:inset-auto sm:z-auto sm:w-80 sm:shrink-0 sm:border-l sm:border-zinc-800">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3 text-sm font-medium text-white">
        <ChatIcon className="h-4 w-4" />
        Messages
      </div>
      <ChatMessages />
      <ChatComposer />
    </div>
  );
}
