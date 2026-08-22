"use client";

import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type TokenResponse = {
  token: string;
  url: string;
};

export default function HostClient() {
  const searchParams = useSearchParams();
  const room = searchParams.get("room") ?? "";

  const [name, setName] = useState("");
  const [webinarTitle, setWebinarTitle] = useState<string | null>(null);
  const [webinarExists, setWebinarExists] = useState(false);
  const [connection, setConnection] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  useEffect(() => {
    if (!room) return;
    fetch(`/api/webinars/${room}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setWebinarTitle(data?.webinar?.title ?? null);
        setWebinarExists(Boolean(data?.webinar));
      })
      .catch(() => {});
  }, [room]);

  const joinAsHost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !room) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, name: name.trim(), role: "host" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to get token");
      const data: TokenResponse = await res.json();
      setConnection(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!room) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500">
        Missing room ID. Go back to the admin dashboard and go live from there.
      </div>
    );
  }

  if (connection) {
    return (
      <LiveKitRoom
        token={connection.token}
        serverUrl={connection.url}
        connect
        audio={micOn}
        video={camOn}
        data-lk-theme="default"
        style={{ height: "100vh" }}
        onConnected={() => {
          if (!webinarExists) return;
          fetch(`/api/webinars/${room}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "live" }),
          }).catch(() => {});
        }}
        onDisconnected={() => {
          setConnection(null);
          if (!webinarExists) return;
          fetch(`/api/webinars/${room}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ended" }),
          }).catch(() => {});
        }}
      >
        <VideoConference />
      </LiveKitRoom>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{webinarTitle ?? "Host webinar"}</h1>
        <p className="mt-1 text-zinc-500">
          Room <span className="font-mono">{room}</span>
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Share this link with viewers:{" "}
          {typeof window !== "undefined" && (
            <a
              href={`${window.location.origin}/watch?room=${room}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono break-all text-blue-600 underline hover:text-blue-500 dark:text-blue-400"
            >
              {`${window.location.origin}/watch?room=${room}`}
            </a>
          )}
        </p>
      </div>

      <form onSubmit={joinAsHost} className="flex w-full max-w-sm flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="h-12 rounded-full border border-zinc-300 bg-white px-5 text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCamOn((v) => !v)}
            aria-pressed={camOn}
            className={`h-11 flex-1 rounded-full border px-4 text-sm font-medium transition-colors ${
              camOn
                ? "border-zinc-300 hover:bg-black/[.04] dark:border-zinc-700 dark:hover:bg-[#1a1a1a]"
                : "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            }`}
          >
            Camera: {camOn ? "On" : "Off"}
          </button>
          <button
            type="button"
            onClick={() => setMicOn((v) => !v)}
            aria-pressed={micOn}
            className={`h-11 flex-1 rounded-full border px-4 text-sm font-medium transition-colors ${
              micOn
                ? "border-zinc-300 hover:bg-black/[.04] dark:border-zinc-700 dark:hover:bg-[#1a1a1a]"
                : "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            }`}
          >
            Mic: {micOn ? "On" : "Off"}
          </button>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="h-12 rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {loading ? "Joining..." : "Go live"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </div>
  );
}
