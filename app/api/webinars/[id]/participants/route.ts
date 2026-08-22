import { NextRequest, NextResponse } from "next/server";
import { getParticipantCount } from "@/lib/livekit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const count = await getParticipantCount(id);
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to get participant count" },
      { status: 500 }
    );
  }
}
