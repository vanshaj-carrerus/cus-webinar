import { NextRequest, NextResponse } from "next/server";
import { inviteToSpeak } from "@/lib/livekit";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; identity: string }> }
) {
  const { id, identity } = await params;
  try {
    await inviteToSpeak(id, identity);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to invite participant" },
      { status: 500 }
    );
  }
}
