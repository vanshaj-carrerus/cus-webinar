import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

type Role = "host" | "viewer";

export async function POST(request: NextRequest) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Server misconfigured: LIVEKIT_API_KEY / LIVEKIT_API_SECRET are not set" },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const room: string | undefined = body?.room;
  const name: string | undefined = body?.name;
  const role: Role = body?.role === "host" ? "host" : "viewer";

  if (!room || !name) {
    return NextResponse.json({ error: "`room` and `name` are required" }, { status: 400 });
  }

  // Unique per-connection identity so the same display name can join from multiple tabs/devices.
  const identity = `${role}-${name}-${crypto.randomUUID().slice(0, 8)}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name,
    ttl: "4h",
  });

  at.addGrant({
    room,
    roomJoin: true,
    // Host can publish camera/mic and is visible in the participant list.
    // Viewer is subscribe-only for media and hidden from the participant
    // list, but can still send/receive chat (data channel).
    canPublish: role === "host",
    canPublishData: true,
    canSubscribe: true,
    hidden: role === "viewer",
  });

  const token = await at.toJwt();

  return NextResponse.json({
    token,
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    identity,
    role,
  });
}
