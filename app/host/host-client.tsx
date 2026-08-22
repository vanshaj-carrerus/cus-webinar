"use client";

import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ParticipantCount from "../participant-count";
import { useOrigin } from "../use-origin";
import { BroadcastIcon, MicIcon, MicOffIcon, VideoIcon, VideoOffIcon } from "../icons";

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
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
            <BroadcastIcon className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {webinarTitle ?? "Host webinar"}
          </h1>
          <p className="mt-1 font-mono text-xs text-zinc-400">room · {room}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <form onSubmit={joinAsHost} className="flex flex-col gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCamOn((v) => !v)}
                aria-pressed={camOn}
                className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  camOn
                    ? "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    : "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                }`}
              >
                {camOn ? <VideoIcon className="h-4 w-4" /> : <VideoOffIcon className="h-4 w-4" />}
                Camera
              </button>
              <button
                type="button"
                onClick={() => setMicOn((v) => !v)}
                aria-pressed={micOn}
                className={`flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  micOn
                    ? "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    : "border-red-200 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                }`}
              >
                {micOn ? <MicIcon className="h-4 w-4" /> : <MicOffIcon className="h-4 w-4" />}
                Mic
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="h-11 rounded-lg bg-indigo-600 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Joining..." : "Go live"}
            </button>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </form>
        </div>

        <p className="mt-4 truncate text-center text-xs text-zinc-400">
          Viewer link:{" "}
          <a
            href={`/watch?room=${room}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-indigo-600 hover:underline dark:text-indigo-400"
          >
            {origin}/watch?room={room}
          </a>
        </p>
      </div>
    </div>
  );
}
