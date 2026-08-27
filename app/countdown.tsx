"use client";

import { useEffect, useState } from "react";

function getMsLeft(target: string) {
  return Math.max(0, new Date(target).getTime() - Date.now());
}

export function Countdown({ target }: { target: string }) {
  const [msLeft, setMsLeft] = useState(() => getMsLeft(target));

  useEffect(() => {
    const interval = setInterval(() => setMsLeft(getMsLeft(target)), 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (msLeft <= 0) {
    return (
      <p className="mt-4 text-sm font-medium text-indigo-600 dark:text-indigo-400">
        Starting any moment now
      </p>
    );
  }

  const totalSeconds = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const units = [
    ...(days > 0 ? [{ value: days, label: "d" }] : []),
    { value: hours, label: "h" },
    { value: minutes, label: "m" },
    { value: seconds, label: "s" },
  ];

  return (
    <div className="mt-5 flex flex-col items-center">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-400">Starts in</p>
      <div className="flex items-center gap-2.5">
        {units.map((unit) => (
          <span
            key={unit.label}
            className="flex min-w-[4.5rem] flex-col items-center rounded-2xl border border-zinc-200 bg-white px-4 py-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="text-4xl font-bold leading-tight text-zinc-900 tabular-nums dark:text-zinc-50">
              {String(unit.value).padStart(2, "0")}
            </span>
            <span className="mt-0.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
              {unit.label}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function LiveBadge() {
  return (
    <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600 dark:bg-red-950/50 dark:text-red-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
      Live now
    </div>
  );
}
