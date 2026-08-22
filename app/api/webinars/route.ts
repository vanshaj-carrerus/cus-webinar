import { NextRequest, NextResponse } from "next/server";
import { createWebinar, listWebinars } from "@/lib/webinars";

export async function GET() {
  try {
    const webinars = await listWebinars();
    return NextResponse.json({ webinars });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const title: string | undefined = body?.title;
  const scheduledAt: string | undefined = body?.scheduledAt;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "`title` is required" }, { status: 400 });
  }

  if (scheduledAt && Number.isNaN(Date.parse(scheduledAt))) {
    return NextResponse.json({ error: "`scheduledAt` must be a valid date" }, { status: 400 });
  }

  try {
    const webinar = await createWebinar(title.trim(), scheduledAt);
    return NextResponse.json({ webinar }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Database error" },
      { status: 500 }
    );
  }
}
