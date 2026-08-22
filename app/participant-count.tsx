"use client";

import { useState } from "react";
import useSWR from "swr";

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
        className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        {data.count} {data.count === 1 ? "person" : "people"} joined
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 max-h-64 w-56 overflow-y-auto rounded-lg bg-black/90 p-2 text-sm text-white shadow-lg backdrop-blur">
          {participants.length === 0 && (
            <p className="px-2 py-1 text-zinc-400">No one has joined yet.</p>
          )}
          {participants.map((p) => (
            <div
              key={p.identity}
              className="flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-white/10"
            >
              <span className="truncate">
                {p.name}
                {p.isHost ? " (host)" : ""}
              </span>
              {canManage && !p.isHost && (
                <button
                  onClick={() => remove(p.identity)}
                  className="shrink-0 text-xs text-red-400 hover:text-red-300"
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
