"use client";

import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ParticipantCount from "../participant-count";
import { useOrigin } from "../use-origin";

type TokenResponse = {
  token: string;
  url: string;
};

interface SavedSession {
  name: string;
  camOn: boolean;
  micOn: boolean;
}

function sessionKey(room: string) {
  return `webinar-host-session-${room}`;
}

function getSavedSession(room: string): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(sessionKey(room));
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

export default function HostClient() {
  const searchParams = useSearchParams();
  const room = searchParams.get("room") ?? "";
  const origin = useOrigin();

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

  const join = async (joinName: string, useCam: boolean, useMic: boolean) => {
    if (!joinName.trim() || !room) return;

    // Keep the pre-join form's fields in sync too, so if this call fails
    // (e.g. an auto-rejoin after a refresh) the form shows the same values
    // instead of a blank retry screen.
    setName(joinName);
    setCamOn(useCam);
    setMicOn(useMic);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, name: joinName.trim(), role: "host" }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to get token");
      const data: TokenResponse = await res.json();
      setConnection(data);
      sessionStorage.setItem(
        sessionKey(room),
        JSON.stringify({ name: joinName.trim(), camOn: useCam, micOn: useMic } satisfies SavedSession)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // If this room has a saved session (we were live here before this tab
  // reloaded), rejoin automatically instead of making the host retype their
  // name and click "Go live" again — closes the gap where viewers would
  // otherwise see the stream drop while the host manually reconnects.
  useEffect(() => {
    if (!room) return;
    const saved = getSavedSession(room);
    if (!saved) return;
    // Deliberate action-on-mount, not a data-fetch-into-state pattern —
    // there's no clean alternative to an effect for "start a network
    // request once, on mount, if a condition holds".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    join(saved.name, saved.camOn, saved.micOn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const joinAsHost = (e: React.FormEvent) => {
    e.preventDefault();
    join(name, camOn, micOn);
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
        style={{ height: "100vh", position: "relative" }}
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
          sessionStorage.removeItem(sessionKey(room));
          if (!webinarExists) return;
          fetch(`/api/webinars/${room}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ended" }),
          }).catch(() => {});
        }}
      >
        <div className="absolute left-3 top-3 z-10">
          <ParticipantCount room={room} canManage />
        </div>
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
          <a
            href={`/watch?room=${room}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono break-all text-blue-600 underline hover:text-blue-500 dark:text-blue-400"
          >
            {origin}/watch?room={room}
          </a>
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
