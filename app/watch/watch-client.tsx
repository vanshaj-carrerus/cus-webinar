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
import {
  BroadcastIcon,
  ChatIcon,
  LeaveIcon,
  MaximizeIcon,
  MicIcon,
  MicOffIcon,
  MinimizeIcon,
  SettingsIcon,
  VideoIcon,
  VideoOffIcon,
} from "../icons";

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
      <div className="flex h-full items-center justify-center text-center text-sm text-zinc-400">
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
  icon,
  label,
  active,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors [&_svg]:h-5 [&_svg]:w-5 ${
        danger
          ? "bg-red-600 text-white hover:bg-red-500"
          : active
            ? "bg-white text-zinc-900"
            : "text-zinc-200 hover:bg-white/15"
      }`}
    >
      {icon}
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
    <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-zinc-900/80 p-2 shadow-lg backdrop-blur">
      <ControlButton
        icon={muted ? <MicOffIcon /> : <MicIcon />}
        label={muted ? "Unmute" : "Mute"}
        active={muted}
        onClick={() => setMuted((v) => !v)}
      />
      <ControlButton
        icon={videoHidden ? <VideoOffIcon /> : <VideoIcon />}
        label={videoHidden ? "Show video" : "Hide video"}
        active={videoHidden}
        onClick={onToggleVideo}
      />
      <ControlButton
        icon={isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
        label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        onClick={toggleFullscreen}
      />
      <ControlButton icon={<ChatIcon />} label="Chat" active={chatOpen} onClick={onToggleChat} />
      <div className="relative">
        <ControlButton
          icon={<SettingsIcon />}
          label="Settings"
          active={settingsOpen}
          onClick={() => setSettingsOpen((v) => !v)}
        />
        {settingsOpen && (
          <div className="absolute bottom-full left-1/2 mb-2 w-56 -translate-x-1/2 rounded-xl border border-white/10 bg-zinc-900/95 p-3 text-white shadow-xl backdrop-blur">
            <p className="mb-2 text-xs font-medium text-zinc-400">Speaker</p>
            <MediaDeviceSelect kind="audiooutput" />
          </div>
        )}
      </div>
      <div className="mx-1.5 h-6 w-px bg-white/15" />
      <DisconnectButton>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500 [&_svg]:h-5 [&_svg]:w-5">
          <LeaveIcon />
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
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">
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
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
            <BroadcastIcon className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {webinarTitle ?? "Watch webinar"}
          </h1>
          <p className="mt-1 font-mono text-xs text-zinc-400">room · {room}</p>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <form onSubmit={joinAsViewer} className="flex flex-col gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:ring-indigo-950"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-11 rounded-lg bg-indigo-600 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join as viewer"}
            </button>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
