"use client";

import {
  CarouselLayout,
  Chat,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  StartAudio,
  useRemoteParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ParticipantCount from "../participant-count";

type TokenResponse = {
  token: string;
  url: string;
};

function Stage() {
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    { onlySubscribed: true }
  );
  // Viewers are hidden participants, so the only remote participant a
  // viewer can see is the host — this tells us whether they're connected
  // at all, as opposed to connected but not sharing camera/mic yet.
  const remoteParticipants = useRemoteParticipants();

  if (tracks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center text-zinc-400">
        {remoteParticipants.length > 0
          ? "The host is connected but hasn't turned on their camera or mic yet."
          : "Waiting for the host to go live..."}
      </div>
    );
  }

  // When the host is both screen-sharing and on camera, show the screen
  // share large with the camera in a small strip — same layout as most
  // webinar platforms. With just one track, it fills the stage.
  const screenShareTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);
  if (!screenShareTrack || tracks.length === 1) {
    return (
      <GridLayout tracks={tracks} style={{ height: "100%" }}>
        <ParticipantTile />
      </GridLayout>
    );
  }

  const carouselTracks = tracks.filter((t) => t !== screenShareTrack);
  return (
    <FocusLayoutContainer style={{ height: "100%" }}>
      <CarouselLayout tracks={carouselTracks}>
        <ParticipantTile />
      </CarouselLayout>
      <FocusLayout trackRef={screenShareTrack} />
    </FocusLayoutContainer>
  );
}

export default function WatchClient() {
  const searchParams = useSearchParams();
  const room = searchParams.get("room") ?? "";

  const [name, setName] = useState("");
  const [webinarTitle, setWebinarTitle] = useState<string | null>(null);
  const [connection, setConnection] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);

  useEffect(() => {
    if (!room) return;
    fetch(`/api/webinars/${room}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setWebinarTitle(data?.webinar?.title ?? null))
      .catch(() => {});
  }, [room]);

  const joinAsViewer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !room) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, name: name.trim(), role: "viewer" }),
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
        Missing room ID. Go back and enter a room to watch from the home page.
      </div>
    );
  }

  if (connection) {
    return (
      <LiveKitRoom
        token={connection.token}
        serverUrl={connection.url}
        connect
        audio={false}
        video={false}
        data-lk-theme="default"
        style={{ height: "100vh" }}
      >
        <div className="flex h-full">
          <div className="relative min-w-0 flex-1">
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
              <ParticipantCount room={room} />
            </div>
            <button
              onClick={() => setChatOpen((v) => !v)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur sm:hidden"
            >
              {chatOpen ? "Hide chat" : "Show chat"}
            </button>
            <Stage />
          </div>
          {chatOpen && (
            <div className="w-full max-w-[320px] shrink-0 border-l border-zinc-800">
              <Chat style={{ height: "100%" }} />
            </div>
          )}
        </div>
        <RoomAudioRenderer />
        <StartAudio label="Click to enable sound" />
      </LiveKitRoom>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{webinarTitle ?? "Watch webinar"}</h1>
        <p className="mt-1 text-zinc-500">
          Room <span className="font-mono">{room}</span>
        </p>
      </div>

      <form onSubmit={joinAsViewer} className="flex w-full max-w-sm flex-col gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="h-12 rounded-full border border-zinc-300 bg-white px-5 text-black outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="h-12 rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {loading ? "Joining..." : "Join as viewer"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </div>
  );
}
