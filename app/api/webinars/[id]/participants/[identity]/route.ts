import { NextRequest, NextResponse } from "next/server";
import { removeParticipant } from "@/lib/livekit";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; identity: string }> }
) {
  const { id, identity } = await params;
  try {
    await removeParticipant(id, identity);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to remove participant" },
      { status: 500 }
    );
  }
}
