import { NextRequest, NextResponse } from "next/server";
import { closeRoom } from "@/lib/livekit";
import { updateWebinarStatus } from "@/lib/webinars";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await closeRoom(id);
    const webinar = await updateWebinarStatus(id, "ended");
    if (!webinar) {
      return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
    }
    return NextResponse.json({ webinar });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to close meeting" },
      { status: 500 }
    );
  }
}
