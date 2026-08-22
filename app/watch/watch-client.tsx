"use client";

import {
  Chat,
  DisconnectButton,
  GridLayout,
  LiveKitRoom,
  MediaDeviceSelect,
  ParticipantTile,
  RoomAudioRenderer,
  StartAudio,
  useRemoteParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  // share filling the stage with the camera as a small picture-in-picture
  // overlay (like most webinar platforms) — a side-by-side split badly
  // letterboxes widescreen screen share content. With just one track, it
  // fills the stage on its own.
  const screenShareTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);
  if (!screenShareTrack || tracks.length === 1) {
    return (
      <GridLayout tracks={tracks} style={{ height: "100%" }}>
        <ParticipantTile />
      </GridLayout>
    );
  }

  const cameraTrack = tracks.find((t) => t !== screenShareTrack);
  return (
    <div className="relative h-full w-full">
      <ParticipantTile trackRef={screenShareTrack} className="h-full w-full" />
      {cameraTrack && (
        <div className="absolute right-4 top-4 h-32 w-48 overflow-hidden rounded-lg border-2 border-white/20 shadow-lg">
          <ParticipantTile trackRef={cameraTrack} className="h-full w-full" />
        </div>
      )}
    </div>
  );
}

function ControlButton({
  label,
  active,
  onClick,
  danger,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 rounded-full px-3 text-xs font-medium transition-colors ${
        danger
          ? "bg-red-600 text-white hover:bg-red-500"
          : active
            ? "bg-white text-black"
            : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {label}
    </button>
  );
}

function ViewerControlBar({
  chatOpen,
  onToggleChat,
  videoHidden,
  onToggleVideo,
  fullscreenTarget,
}: {
  chatOpen: boolean;
  onToggleChat: () => void;
  videoHidden: boolean;
  onToggleVideo: () => void;
  fullscreenTarget: React.RefObject<HTMLElement | null>;
}) {
  const remoteParticipants = useRemoteParticipants();
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    remoteParticipants.forEach((p) => p.setVolume(muted ? 0 : 1));
  }, [muted, remoteParticipants]);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      fullscreenTarget.current?.requestFullscreen();
    }
  };

  return (
    <div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3 py-2 backdrop-blur">
      <ControlButton label={muted ? "Unmute" : "Mute"} active={muted} onClick={() => setMuted((v) => !v)} />
      <ControlButton
        label={videoHidden ? "Show video" : "Hide video"}
        active={videoHidden}
        onClick={onToggleVideo}
      />
      <ControlButton
        label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        active={isFullscreen}
        onClick={toggleFullscreen}
      />
      <ControlButton label="Chat" active={chatOpen} onClick={onToggleChat} />
      <div className="relative">
        <ControlButton label="Settings" active={settingsOpen} onClick={() => setSettingsOpen((v) => !v)} />
        {settingsOpen && (
          <div className="absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-lg bg-black/90 p-3 text-white shadow-lg backdrop-blur">
            <p className="mb-2 text-xs font-medium text-zinc-400">Speaker</p>
            <MediaDeviceSelect kind="audiooutput" />
          </div>
        )}
      </div>
      <DisconnectButton>
        <span className="flex h-9 items-center rounded-full bg-red-600 px-3 text-xs font-medium text-white hover:bg-red-500">
          Leave
        </span>
      </DisconnectButton>
    </div>
  );
}

export default function WatchClient() {
  const searchParams = useSearchParams();
  const room = searchParams.get("room") ?? "";
  const fullscreenTarget = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [webinarTitle, setWebinarTitle] = useState<string | null>(null);
  const [connection, setConnection] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [videoHidden, setVideoHidden] = useState(false);

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
        onDisconnected={() => setConnection(null)}
      >
        <div ref={fullscreenTarget} className="relative flex h-full bg-black">
          <div className="relative min-w-0 flex-1">
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
              <ParticipantCount room={room} />
            </div>
            {videoHidden ? (
              <div className="flex h-full items-center justify-center text-zinc-400">
                Video hidden — audio only
              </div>
            ) : (
              <Stage />
            )}
            <ViewerControlBar
              chatOpen={chatOpen}
              onToggleChat={() => setChatOpen((v) => !v)}
              videoHidden={videoHidden}
              onToggleVideo={() => setVideoHidden((v) => !v)}
              fullscreenTarget={fullscreenTarget}
            />
          </div>
          {chatOpen && (
            // Full-screen overlay on mobile (there's no room to split the
            // screen with a usable video), a fixed-width side panel on
            // larger screens where both can fit side by side.
            <div className="absolute inset-0 z-20 bg-black sm:static sm:inset-auto sm:z-auto sm:w-80 sm:shrink-0 sm:border-l sm:border-zinc-800">
              {/* Chat's own "lk-chat" class hardcodes `position: fixed; top:
                  0; right: 0`, which makes it float independently of this
                  wrapper (and overflow the viewport) instead of filling it.
                  Override via inline style, which always wins the cascade. */}
              <Chat
                style={{
                  position: "static",
                  top: "auto",
                  right: "auto",
                  bottom: "auto",
                  width: "100%",
                  maxWidth: "100%",
                  height: "100%",
                }}
              />
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
