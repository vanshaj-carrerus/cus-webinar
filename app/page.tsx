"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BroadcastIcon } from "./icons";

export default function Home() {
  const router = useRouter();
  const [joinRoomId, setJoinRoomId] = useState("");

  const joinWebinar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    router.push(`/watch?room=${encodeURIComponent(joinRoomId.trim())}`);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
            <BroadcastIcon className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Webinar Portal
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            One host, unlimited viewers — powered by a self-hosted LiveKit SFU.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <Link
            href="/admin"
            className="flex h-11 w-full items-center justify-center rounded-lg bg-indigo-600 px-5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
          >
            Open admin dashboard
          </Link>

          <div className="flex items-center gap-3 py-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-600">
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
            or join as a viewer
            <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <form onSubmit={joinWebinar} className="flex gap-2">
            <input
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value)}
              placeholder="Enter room ID"
              className="h-11 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
            />
            <button
              type="submit"
              className="h-11 shrink-0 rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Watch
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
