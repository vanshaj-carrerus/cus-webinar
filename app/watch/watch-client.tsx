"use client";

import {
  DisconnectButton,
  LiveKitRoom,
  MediaDeviceSelect,
  RoomAudioRenderer,
  StartAudio,
  useLocalParticipant,
  useRemoteParticipants,
} from "@livekit/components-react";
import { ParticipantEvent } from "livekit-client";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import ParticipantCount from "../participant-count";
import { Stage } from "../video-stage";
import { ChatPanel } from "../chat-panel";
import { ControlButton } from "../control-button";
import {
  BroadcastIcon,
  ChatIcon,
  LeaveIcon,
  MaximizeIcon,
  MicIcon,
  MicOffIcon,
  MinimizeIcon,
  ScreenShareIcon,
  SettingsIcon,
  VideoIcon,
  VideoOffIcon,
} from "../icons";

type TokenResponse = {
  token: string;
  url: string;
};

// Viewers are visible participants too (so chat can resolve their names —
// see app/api/token/route.ts), so we can't just check "is anyone else
// here" to know whether the host specifically is connected; check the
// identity prefix our token route assigns instead.
function WaitingForHost() {
  const remoteParticipants = useRemoteParticipants();
  const hostPresent = remoteParticipants.some((p) => p.identity.startsWith("host-"));
  return hostPresent
    ? "The host is connected but hasn't turned on their camera or mic yet."
    : "Waiting for the host to go live...";
}

// Listens for the host promoting this viewer to a speaker (a server-side
// permission change, pushed live via LiveKit's ParticipantPermissionsChanged
// event) and automatically turns on their camera/mic. If the host later
// revokes it, their tracks are stopped automatically.
function SpeakerInvite() {
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const [canPublish, setCanPublish] = useState(
    () => localParticipant.permissions?.canPublish ?? false
  );

  useEffect(() => {
    const handlePermissionsChanged = () => {
      setCanPublish(localParticipant.permissions?.canPublish ?? false);
    };
    localParticipant.on(ParticipantEvent.ParticipantPermissionsChanged, handlePermissionsChanged);
    return () => {
      localParticipant.off(ParticipantEvent.ParticipantPermissionsChanged, handlePermissionsChanged);
    };
  }, [localParticipant]);

  // Covers both the live invite (canPublish flips to true) and a page
  // refresh where permission was already granted on mount.
  useEffect(() => {
    if (canPublish) {
      localParticipant.setCameraEnabled(true).catch(() => {});
      localParticipant.setMicrophoneEnabled(true).catch(() => {});
    } else {
      localParticipant.setCameraEnabled(false).catch(() => {});
      localParticipant.setMicrophoneEnabled(false).catch(() => {});
    }
  }, [canPublish, localParticipant]);

  if (!canPublish) return null;

  return (
    <div className="absolute left-1/2 top-3 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-emerald-950/90 px-3 py-1.5 text-xs font-medium text-emerald-300 shadow-lg backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      You&apos;re live
      <button
        onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
        aria-label={isMicrophoneEnabled ? "Mute your mic" : "Unmute your mic"}
        className="ml-1 flex h-6 w-6 items-center justify-center rounded-full text-emerald-200 hover:bg-white/10"
      >
        {isMicrophoneEnabled ? <MicIcon className="h-3.5 w-3.5" /> : <MicOffIcon className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
        aria-label={isCameraEnabled ? "Turn off your camera" : "Turn on your camera"}
        className="flex h-6 w-6 items-center justify-center rounded-full text-emerald-200 hover:bg-white/10"
      >
        {isCameraEnabled ? <VideoIcon className="h-3.5 w-3.5" /> : <VideoOffIcon className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={() => localParticipant.setScreenShareEnabled(!isScreenShareEnabled)}
        aria-label={isScreenShareEnabled ? "Stop sharing your screen" : "Share your screen"}
        className={`flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10 ${
          isScreenShareEnabled ? "text-white" : "text-emerald-200"
        }`}
      >
        <ScreenShareIcon className="h-3.5 w-3.5" />
      </button>
    </div>
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
            <SpeakerInvite />
            {videoHidden ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                Video hidden — audio only
              </div>
            ) : (
              <Stage emptyState={<WaitingForHost />} />
            )}
            <ViewerControlBar
              chatOpen={chatOpen}
              onToggleChat={() => setChatOpen((v) => !v)}
              videoHidden={videoHidden}
              onToggleVideo={() => setVideoHidden((v) => !v)}
              fullscreenTarget={fullscreenTarget}
            />
          </div>
          {chatOpen && <ChatPanel />}
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
              className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:bg-zinc-950 dark:focus:ring-indigo-950"
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
