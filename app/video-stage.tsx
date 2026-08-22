"use client";

import { GridLayout, ParticipantTile, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

// Shared by the host and viewer live views: when screen share and camera
// are both active, the screen share fills the stage with the camera as a
// small picture-in-picture overlay (like most webinar platforms) — a
// side-by-side split badly letterboxes widescreen screen share content.
// With just one track, it fills the stage on its own.
export function Stage({ emptyState }: { emptyState: React.ReactNode }) {
  const tracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: true,
  });

  if (tracks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center text-sm text-zinc-400">
        {emptyState}
      </div>
    );
  }

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
