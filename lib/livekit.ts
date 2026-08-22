import { RoomServiceClient } from "livekit-server-sdk";

let client: RoomServiceClient | undefined;

export function getRoomService(): RoomServiceClient {
  if (client) return client;

  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    throw new Error("Missing LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET");
  }

  client = new RoomServiceClient(url.replace(/^ws/, "http"), apiKey, apiSecret);
  return client;
}

// Forcibly ends a live room, disconnecting every participant (host and viewers).
// No-op if the room isn't currently active on the LiveKit server.
export async function closeRoom(room: string): Promise<void> {
  try {
    await getRoomService().deleteRoom(room);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status !== 404) throw err;
  }
}

export interface RoomParticipant {
  identity: string;
  name: string;
  isHost: boolean;
  canPublish: boolean;
  joinedAt: number;
}

// All participants currently in the room, including hidden viewers
// (RoomServiceClient sees hidden participants even though other clients
// don't). Returns [] if the room isn't active yet.
export async function getParticipants(room: string): Promise<RoomParticipant[]> {
  try {
    const participants = await getRoomService().listParticipants(room);
    return participants
      .map((p) => ({
        identity: p.identity,
        name: p.name || p.identity,
        // Determined from the identity prefix our token route assigns
        // ("host-..." / "viewer-..."), not from canPublish — an invited
        // viewer can also have canPublish=true without being the host.
        isHost: p.identity.startsWith("host-"),
        canPublish: p.permission?.canPublish ?? false,
        joinedAt: Number(p.joinedAt) * 1000,
      }))
      .sort((a, b) => a.joinedAt - b.joinedAt);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404) return [];
    throw err;
  }
}

// Promotes a viewer to a visible, publishing participant so they can turn
// on their camera/mic (e.g. the host inviting someone to speak). Setting
// hidden:false so other participants can actually see/subscribe to them.
export async function inviteToSpeak(room: string, identity: string): Promise<void> {
  await getRoomService().updateParticipant(room, identity, {
    permission: { canSubscribe: true, canPublish: true, canPublishData: true, hidden: false },
  });
}

// Reverts a promoted viewer back to view-only and hidden.
export async function revokeSpeaker(room: string, identity: string): Promise<void> {
  await getRoomService().updateParticipant(room, identity, {
    permission: { canSubscribe: true, canPublish: false, canPublishData: true, hidden: true },
  });
}

// Disconnects one participant by identity. No-op if they've already left.
export async function removeParticipant(room: string, identity: string): Promise<void> {
  try {
    await getRoomService().removeParticipant(room, identity);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status !== 404) throw err;
  }
}
