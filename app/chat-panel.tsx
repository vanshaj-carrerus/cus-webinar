"use client";

import { Chat } from "@livekit/components-react";

// Full-screen overlay on mobile (there's no room to split the screen with
// a usable video), a fixed-width side panel on larger screens where both
// can fit side by side.
export function ChatPanel() {
  return (
    <div className="absolute inset-0 z-20 bg-black sm:static sm:inset-auto sm:z-auto sm:w-80 sm:shrink-0 sm:border-l sm:border-zinc-800">
      {/* Chat's own "lk-chat" class hardcodes `position: fixed; top: 0;
          right: 0`, which makes it float independently of this wrapper
          (and overflow the viewport) instead of filling it. Override via
          inline style, which always wins the cascade. */}
      <Chat
        style={{
          position: "static",
          top: "auto",
          right: "auto",
          bottom: "auto",
          width: "100%",
          maxWidth: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
