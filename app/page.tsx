"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [joinRoomId, setJoinRoomId] = useState("");

  const joinWebinar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    router.push(`/watch?room=${encodeURIComponent(joinRoomId.trim())}`);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 bg-zinc-50 px-6 py-24 dark:bg-black">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Webinar Portal
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          One host, unlimited viewers. Powered by a self-hosted LiveKit SFU.
        </p>
      </div>

      <div className="flex w-full max-w-md flex-col gap-6">
        <Link
          href="/admin"
          className="flex h-12 w-full items-center justify-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Admin dashboard (host)
        </Link>

        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          or
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <form onSubmit={joinWebinar} className="flex gap-2">
          <input
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            placeholder="Enter room ID to watch"
            className="h-12 flex-1 rounded-full border border-zinc-300 bg-white px-5 text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          />
          <button
            type="submit"
            className="h-12 rounded-full border border-solid border-black/[.08] px-5 font-medium transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Watch
          </button>
        </form>
      </div>
    </div>
  );
}
