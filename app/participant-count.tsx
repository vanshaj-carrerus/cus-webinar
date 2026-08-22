"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ParticipantCount({ room }: { room: string }) {
  const { data } = useSWR<{ count: number }>(`/api/webinars/${room}/participants`, fetcher, {
    refreshInterval: 5000,
  });

  if (data === undefined) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
      {data.count} {data.count === 1 ? "person" : "people"} joined
    </div>
  );
}
