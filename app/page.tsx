"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChatIcon, ScreenShareIcon, UsersIcon } from "./icons";

const FEATURES = [
  { icon: UsersIcon, label: "Unlimited viewers" },
  { icon: ScreenShareIcon, label: "Screen sharing" },
  { icon: ChatIcon, label: "Live chat" },
];

export default function Home() {
  const router = useRouter();
  const [joinRoomId, setJoinRoomId] = useState("");

  const joinWebinar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinRoomId.trim()) return;
    router.push(`/watch?room=${encodeURIComponent(joinRoomId.trim())}`);
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
      <div className="grid w-full max-w-5xl items-center gap-16 lg:grid-cols-2">
        <div className="mx-auto w-full max-w-sm lg:mx-0">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            Self-hosted &middot; LiveKit SFU
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Webinar Portal
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            One host, unlimited viewers. Go live in seconds — no per-seat pricing, no vendor lock-in.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <Icon className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                {label}
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
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
                className="h-11 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:bg-zinc-950 dark:focus:ring-indigo-950"
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

        <div className="relative hidden lg:block">
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-sm">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
              <span className="ml-3 inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-400">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Live
              </span>
            </div>
            <div className="p-5">
              <div className="aspect-video w-full rounded-xl bg-gradient-to-br from-indigo-500 to-violet-700" />
              <div className="mt-3 grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-video rounded-lg bg-zinc-800" />
                ))}
              </div>
              <div className="mt-5 flex items-center justify-center gap-2.5">
                <span className="h-9 w-9 rounded-full bg-white/10" />
                <span className="h-9 w-9 rounded-full bg-white/10" />
                <span className="h-9 w-9 rounded-full bg-red-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
