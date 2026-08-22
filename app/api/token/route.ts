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
    // Host can publish camera/mic; viewers are subscribe-only for media but
    // can still send/receive chat (data channel). Both are visible
    // (hidden:false) — LiveKit's Chat component can't resolve a hidden
    // participant's name/track for other clients, which made viewer chat
    // messages show up with a blank sender name. Viewers still don't
    // clutter the video grid since they publish nothing until invited to
    // speak (see lib/livekit.ts inviteToSpeak).
    canPublish: role === "host",
    canPublishData: true,
    canSubscribe: true,
    hidden: false,
  });

  const token = await at.toJwt();

  return NextResponse.json({
    token,
    url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    identity,
    role,
  });
}
