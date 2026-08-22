"use client";

import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import type { Webinar } from "@/lib/webinars";
import { useOrigin } from "../use-origin";
import { BroadcastIcon, CalendarIcon, CheckIcon, CopyIcon, LinkIcon, PlusIcon, TrashIcon } from "../icons";

const STATUS_STYLES: Record<Webinar["status"], string> = {
  scheduled: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  live: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  ended: "bg-zinc-50 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-500",
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// A <input type="datetime-local"> value ("YYYY-MM-DDTHH:mm") has no timezone
// of its own — since scheduling is always meant in Indian time, interpret it
// as IST (UTC+5:30, no DST) regardless of the admin's browser timezone.
function istInputToIso(value: string): string {
  return new Date(`${value}:00+05:30`).toISOString();
}

function formatIST(iso: string): string {
  return `${new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  })} IST`;
}

export default function AdminPage() {
  const { data, mutate } = useSWR<{ webinars: Webinar[] }>("/api/webinars", fetcher, {
    refreshInterval: 5000,
  });
  const webinars = data?.webinars ?? [];
  const origin = useOrigin();

  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  const createWebinar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/webinars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          scheduledAt: scheduledAt ? istInputToIso(scheduledAt) : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to create webinar");
      setTitle("");
      setScheduledAt("");
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

  const closeMeeting = async (id: string) => {
    if (!window.confirm("Close this meeting? Everyone currently in it will be disconnected.")) {
      return;
    }
    setClosingId(id);
    try {
      await fetch(`/api/webinars/${id}/close`, { method: "POST" });
      await mutate();
    } finally {
      setClosingId(null);
    }
  };

  const copyWatchLink = async (id: string) => {
    const url = `${window.location.origin}/watch?room=${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId((current) => (current === id ? null : current)), 1500);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-14">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
          <BroadcastIcon className="h-4.5 w-4.5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Webinar admin</h1>
          <p className="text-sm text-zinc-500">Create a webinar, then go live as the host.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <form onSubmit={createWebinar} className="flex flex-col gap-3 sm:flex-row">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Webinar title"
            className="h-11 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
          />
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            title="Scheduled time (IST)"
            className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
          />
          <button
            type="submit"
            disabled={creating}
            className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
        <p className="mt-2.5 text-xs text-zinc-400">
          Scheduled time is treated as Indian Standard Time (IST), regardless of your browser&apos;s timezone.
        </p>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>

      <div className="flex flex-col gap-3">
        {webinars.length === 0 && (
          <p className="rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-400 dark:border-zinc-800">
            No webinars yet. Create one above.
          </p>
        )}

        {webinars.map((webinar) => (
          <div
            key={webinar.id}
            className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-start sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-medium text-zinc-900 dark:text-zinc-50">{webinar.title}</h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[webinar.status]}`}
                >
                  {webinar.status === "live" && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                  {webinar.status}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs text-zinc-400">room · {webinar.id}</p>
              {webinar.scheduledAt && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
                  <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
                  {formatIST(webinar.scheduledAt)}
                </p>
              )}
              <div className="mt-2.5 flex flex-col gap-1">
                <p className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-500">
                  <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="shrink-0 text-zinc-400">Host:</span>
                  <a
                    href={`/host?room=${webinar.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate font-mono text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {origin}/host?room={webinar.id}
                  </a>
                </p>
                <p className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-500">
                  <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="shrink-0 text-zinc-400">Viewer:</span>
                  <a
                    href={`/watch?room=${webinar.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate font-mono text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {origin}/watch?room={webinar.id}
                  </a>
                </p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Link
                href={`/host?room=${webinar.id}`}
                className="flex h-9 items-center rounded-lg bg-indigo-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
              >
                {webinar.status === "live" ? "Rejoin as host" : "Go live"}
              </Link>
              <button
                onClick={() => copyWatchLink(webinar.id)}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {copiedId === webinar.id ? (
                  <>
                    <CheckIcon className="h-3.5 w-3.5 text-emerald-500" /> Copied
                  </>
                ) : (
                  <>
                    <CopyIcon className="h-3.5 w-3.5" /> Copy link
                  </>
                )}
              </button>
              {webinar.status !== "ended" && (
                <button
                  onClick={() => closeMeeting(webinar.id)}
                  disabled={closingId === webinar.id}
                  className="flex h-9 items-center rounded-lg border border-red-200 px-3.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  {closingId === webinar.id ? "Closing..." : "Close meeting"}
                </button>
              )}
              <button
                onClick={() => removeWebinar(webinar.id)}
                aria-label="Delete webinar"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
