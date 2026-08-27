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
import { Countdown, LiveBadge } from "../countdown";
import {
  ChatIcon,
  CheckIcon,
  LeaveIcon,
  MaximizeIcon,
  MicIcon,
  MicOffIcon,
  MinimizeIcon,
  ScreenShareIcon,
  SettingsIcon,
  SpeakerIcon,
  SpeakerOffIcon,
  VideoIcon,
  VideoOffIcon,
} from "../icons";

type TokenResponse = {
  token: string;
  url: string;
};

const PREJOIN_TIPS = [
  { title: "Desktop/Laptop", subtitle: "Recommended" },
  { title: "Use Chrome", subtitle: "For better experience" },
  { title: "Stable network", subtitle: ">500kbps speed" },
];

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

// Tracks whether the host has promoted this viewer to a speaker (a
// server-side permission change, pushed live via LiveKit's
// ParticipantPermissionsChanged event). Shared by the invite banner and the
// control bar so both agree on when the candidate's own mic/camera are
// actually usable. `onChange` fires from inside the LiveKit event callback
// itself (not a derived effect) for side effects that must run exactly once
// per permission transition, such as resetting the invite prompt.
function useCanPublish(onChange?: (canPublish: boolean) => void) {
  const { localParticipant } = useLocalParticipant();
  const [canPublish, setCanPublish] = useState(
    () => localParticipant.permissions?.canPublish ?? false
  );
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const handlePermissionsChanged = () => {
      const next = localParticipant.permissions?.canPublish ?? false;
      setCanPublish(next);
      onChangeRef.current?.(next);
    };
    localParticipant.on(ParticipantEvent.ParticipantPermissionsChanged, handlePermissionsChanged);
    return () => {
      localParticipant.off(ParticipantEvent.ParticipantPermissionsChanged, handlePermissionsChanged);
    };
  }, [localParticipant]);

  return canPublish;
}

// Shows an allow/deny prompt when the host invites this viewer to speak. If
// the host later revokes the invite, their camera/mic are stopped
// automatically and the prompt resets so a re-invite asks again.
function SpeakerInvite() {
  const { localParticipant } = useLocalParticipant();
  const [promptDismissed, setPromptDismissed] = useState(false);
  const canPublish = useCanPublish((next) => {
    if (!next) {
      localParticipant.setCameraEnabled(false).catch(() => {});
      localParticipant.setMicrophoneEnabled(false).catch(() => {});
      setPromptDismissed(false);
    }
  });

  if (!canPublish || promptDismissed) return null;

  const allow = async () => {
    await Promise.all([
      localParticipant.setCameraEnabled(true),
      localParticipant.setMicrophoneEnabled(true),
    ]).catch(() => {});
    setPromptDismissed(true);
  };

  return (
    <div className="absolute left-1/2 top-3 z-30 flex w-[calc(100%-1.5rem)] max-w-sm -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-indigo-400/30 bg-indigo-950/90 px-4 py-3 text-white shadow-lg backdrop-blur">
      <p className="text-sm">The host invited you to turn on your camera &amp; mic.</p>
      <div className="flex shrink-0 gap-1.5">
        <button
          onClick={() => setPromptDismissed(true)}
          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/10"
        >
          Deny
        </button>
        <button
          onClick={allow}
          className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium hover:bg-indigo-500"
        >
          Allow
        </button>
      </div>
    </div>
  );
}

// The viewer/candidate's own controls: mic and camera control this
// participant's own device (only usable once the host has invited them to
// speak — see useCanPublish), while the speaker button controls what they
// hear from everyone else. Mirrors HostControlBar so both sides behave the
// same way for "my own" audio/video.
function ViewerControlBar({
  chatOpen,
  onToggleChat,
  fullscreenTarget,
}: {
  chatOpen: boolean;
  onToggleChat: () => void;
  fullscreenTarget: React.RefObject<HTMLElement | null>;
}) {
  const { localParticipant, isCameraEnabled, isMicrophoneEnabled, isScreenShareEnabled } =
    useLocalParticipant();
  const canPublish = useCanPublish();
  const remoteParticipants = useRemoteParticipants();
  const [speakerMuted, setSpeakerMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    remoteParticipants.forEach((p) => p.setVolume(speakerMuted ? 0 : 1));
  }, [speakerMuted, remoteParticipants]);

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
    <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/10 bg-zinc-900/90 p-1.5 shadow-xl shadow-black/40 backdrop-blur-md">
      <ControlButton
        icon={isMicrophoneEnabled ? <MicIcon /> : <MicOffIcon />}
        label={
          !canPublish
            ? "Ask the host to invite you to speak"
            : isMicrophoneEnabled
              ? "Mute your mic"
              : "Unmute your mic"
        }
        active={canPublish && !isMicrophoneEnabled}
        disabled={!canPublish}
        onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
      />
      <ControlButton
        icon={isCameraEnabled ? <VideoIcon /> : <VideoOffIcon />}
        label={
          !canPublish
            ? "Ask the host to invite you to speak"
            : isCameraEnabled
              ? "Turn off your camera"
              : "Turn on your camera"
        }
        active={canPublish && !isCameraEnabled}
        disabled={!canPublish}
        onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
      />
      {canPublish && (
        <ControlButton
          icon={<ScreenShareIcon />}
          label={isScreenShareEnabled ? "Stop sharing your screen" : "Share your screen"}
          active={isScreenShareEnabled}
          onClick={() =>
            localParticipant.setScreenShareEnabled(!isScreenShareEnabled, { audio: true })
          }
        />
      )}

      <div className="mx-1 h-6 w-px shrink-0 bg-white/10" />

      <ControlButton
        icon={speakerMuted ? <SpeakerOffIcon /> : <SpeakerIcon />}
        label={speakerMuted ? "Unmute audio" : "Mute audio"}
        active={speakerMuted}
        onClick={() => setSpeakerMuted((v) => !v)}
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
          <div className="absolute bottom-full left-1/2 mb-3 w-56 -translate-x-1/2 rounded-xl border border-white/10 bg-zinc-900/95 p-3 text-white shadow-2xl shadow-black/50 backdrop-blur-md">
            <p className="mb-2 text-xs font-medium text-zinc-400">Speaker</p>
            <MediaDeviceSelect kind="audiooutput" />
          </div>
        )}
      </div>

      <div className="mx-1 h-6 w-px shrink-0 bg-white/10" />

      <DisconnectButton>
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white transition-colors duration-150 hover:bg-red-500 [&_svg]:h-[18px] [&_svg]:w-[18px]">
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

  const [name, setName] = useState(() =>
    typeof window === "undefined" ? "" : (localStorage.getItem("webinarViewerName") ?? "")
  );
  const [webinarTitle, setWebinarTitle] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [webinarStatus, setWebinarStatus] = useState<string | null>(null);
  const [connection, setConnection] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);

  useEffect(() => {
    if (!room) return;
    fetch(`/api/webinars/${room}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setWebinarTitle(data?.webinar?.title ?? null);
        setScheduledAt(data?.webinar?.scheduledAt ?? null);
        setWebinarStatus(data?.webinar?.status ?? null);
      })
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
            <Stage emptyState={<WaitingForHost />} />
            <ViewerControlBar
              chatOpen={chatOpen}
              onToggleChat={() => setChatOpen((v) => !v)}
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
    <div className="flex min-h-full flex-1 flex-col bg-black">
      <div className="flex items-center border-b border-white/10 bg-zinc-950 px-5 py-3.5">
        <h1 className="truncate text-sm font-semibold text-white">
          {webinarTitle ?? "Webinar"}
        </h1>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          <p className="text-center text-xs font-medium text-zinc-500">
            Ensure the following for a smoother experience during the session
          </p>

          <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-4">
            {PREJOIN_TIPS.map((tip) => (
              <div key={tip.title} className="flex flex-col items-center gap-1.5 text-center">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <CheckIcon className="h-3 w-3" />
                </span>
                <p className="text-xs font-semibold text-zinc-700">{tip.title}</p>
                <p className="text-[11px] leading-tight text-zinc-400">{tip.subtitle}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-zinc-100 pt-5 text-center">
            <h2 className="text-sm font-semibold text-zinc-900">
              {webinarTitle ?? "Watch webinar"}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-zinc-400">room &middot; {room}</p>
            {webinarStatus === "live" ? (
              <LiveBadge />
            ) : (
              scheduledAt && <Countdown target={scheduledAt} />
            )}
          </div>

          <form onSubmit={joinAsViewer} className="mt-5 flex flex-col gap-3">
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                localStorage.setItem("webinarViewerName", e.target.value);
              }}
              placeholder="Your name"
              className="h-11 rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none transition-colors focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
            {name.trim() && (
              <p className="-mt-1 text-center text-xs text-zinc-400">
                You are joining as <span className="font-medium text-zinc-600">{name.trim()}</span>
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="h-11 rounded-lg bg-indigo-600 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join"}
            </button>
            {error && <p className="text-center text-xs text-red-500">{error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
