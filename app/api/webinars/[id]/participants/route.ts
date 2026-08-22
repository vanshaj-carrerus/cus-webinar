import { NextRequest, NextResponse } from "next/server";
import { getParticipants } from "@/lib/livekit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const participants = await getParticipants(id);
    return NextResponse.json({ count: participants.length, participants });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get participants" },
      { status: 500 }
    );
  }
}
