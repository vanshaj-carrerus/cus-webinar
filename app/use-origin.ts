"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

// Reads window.location.origin without a hydration mismatch: the server
// snapshot is always "" (window doesn't exist there), and the client
// snapshot is the real origin. useSyncExternalStore is the React-blessed
// way to read a value that legitimately differs between server and client.
export function useOrigin(): string {
  return useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => ""
  );
}
