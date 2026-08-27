import { NextRequest, NextResponse } from "next/server";
import {
  deleteWebinar,
  getWebinar,
  updateWebinarSchedule,
  updateWebinarStatus,
  WebinarStatus,
} from "@/lib/webinars";

const VALID_STATUSES: WebinarStatus[] = ["scheduled", "live", "ended"];

function dbErrorResponse(err: unknown) {
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Database error" },
    { status: 500 }
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const webinar = await getWebinar(id);
    if (!webinar) {
      return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
    }
    return NextResponse.json({ webinar });
  } catch (err) {
    return dbErrorResponse(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status: WebinarStatus | undefined = body?.status;
  const scheduledAt: string | undefined = body?.scheduledAt;

  if (status === undefined && scheduledAt === undefined) {
    return NextResponse.json(
      { error: "Provide `status` and/or `scheduledAt` to update" },
      { status: 400 }
    );
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `\`status\` must be one of ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }
  if (scheduledAt !== undefined && Number.isNaN(Date.parse(scheduledAt))) {
    return NextResponse.json({ error: "`scheduledAt` must be a valid date" }, { status: 400 });
  }

  try {
    let webinar;
    if (status !== undefined) {
      webinar = await updateWebinarStatus(id, status);
    }
    if (scheduledAt !== undefined) {
      webinar = await updateWebinarSchedule(id, scheduledAt);
    }
    if (!webinar) {
      return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
    }
    return NextResponse.json({ webinar });
  } catch (err) {
    return dbErrorResponse(err);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const ok = await deleteWebinar(id);
    if (!ok) {
      return NextResponse.json({ error: "Webinar not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return dbErrorResponse(err);
  }
}
