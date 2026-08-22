"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import type { Webinar } from "@/lib/webinars";

const STATUS_STYLES: Record<Webinar["status"], string> = {
  scheduled: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  live: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  ended: "bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-500",
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AdminPage() {
  const { data, mutate } = useSWR<{ webinars: Webinar[] }>("/api/webinars", fetcher, {
    refreshInterval: 5000,
  });
  const webinars = data?.webinars ?? [];

  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const createWebinar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/webinars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create webinar");
      setTitle("");
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  };

  const removeWebinar = async (id: string) => {
    await fetch(`/api/webinars/${id}`, { method: "DELETE" });
    await mutate();
  };

  const copyWatchLink = async (id: string) => {
    const url = `${window.location.origin}/watch?room=${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold">Webinar admin</h1>
        <p className="mt-1 text-zinc-500">Create a webinar, then go live as the host.</p>
      </div>

      <form onSubmit={createWebinar} className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Webinar title"
          className="h-12 flex-1 rounded-full border border-zinc-300 bg-white px-5 text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={creating}
          className="h-12 rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {creating ? "Creating..." : "Create webinar"}
        </button>
      </form>
      {error && <p className="-mt-4 text-sm text-red-500">{error}</p>}

      <div className="flex flex-col gap-3">
        {webinars.length === 0 && (
          <p className="text-sm text-zinc-500">No webinars yet. Create one above.</p>
        )}

        {webinars.map((webinar) => (
          <div
            key={webinar.id}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-medium">{webinar.title}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[webinar.status]}`}
                >
                  {webinar.status}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-xs text-zinc-500">room: {webinar.id}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/host?room=${webinar.id}`}
                className="flex h-10 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              >
                {webinar.status === "live" ? "Rejoin as host" : "Go live"}
              </Link>
              <button
                onClick={() => copyWatchLink(webinar.id)}
                className="flex h-10 items-center rounded-full border border-zinc-300 px-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-zinc-700 dark:hover:bg-[#1a1a1a]"
              >
                {copiedId === webinar.id ? "Link copied" : "Copy viewer link"}
              </button>
              <button
                onClick={() => removeWebinar(webinar.id)}
                className="flex h-10 items-center rounded-full px-4 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
