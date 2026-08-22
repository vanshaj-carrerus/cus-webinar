import { NextRequest, NextResponse } from "next/server";
import { revokeSpeaker } from "@/lib/livekit";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; identity: string }> }
) {
  const { id, identity } = await params;
  try {
    await revokeSpeaker(id, identity);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to revoke participant" },
      { status: 500 }
    );
  }
}
