"use client";

import { useState } from "react";
import useSWR from "swr";
import { UsersIcon } from "./icons";

interface Participant {
  identity: string;
  name: string;
  isHost: boolean;
  joinedAt: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// canManage: whether to show "Remove" controls (host view only — a viewer
// should never be able to kick another participant).
export default function ParticipantCount({
  room,
  canManage = false,
}: {
  room: string;
  canManage?: boolean;
}) {
  const { data, mutate } = useSWR<{ count: number; participants: Participant[] }>(
    `/api/webinars/${room}/participants`,
    fetcher,
    { refreshInterval: 5000 }
  );
  const [open, setOpen] = useState(false);

  if (data === undefined) return null;

  const participants = data.participants ?? [];

  const remove = async (identity: string) => {
    await fetch(`/api/webinars/${room}/participants/${encodeURIComponent(identity)}`, {
      method: "DELETE",
    });
    await mutate();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-black/70"
      >
        <UsersIcon className="h-3.5 w-3.5" />
        {data.count} {data.count === 1 ? "person" : "people"} joined
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 max-h-64 w-60 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/95 p-1.5 text-sm text-white shadow-xl backdrop-blur">
          {participants.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-zinc-400">No one has joined yet.</p>
          )}
          {participants.map((p) => (
            <div
              key={p.identity}
              className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 hover:bg-white/10"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span className="truncate">{p.name}</span>
                {p.isHost && (
                  <span className="shrink-0 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
                    Host
                  </span>
                )}
              </span>
              {canManage && !p.isHost && (
                <button
                  onClick={() => remove(p.identity)}
                  className="shrink-0 rounded px-1.5 py-0.5 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
