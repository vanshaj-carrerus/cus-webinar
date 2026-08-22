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
