import { NextRequest, NextResponse } from "next/server";
import { createWebinar, listWebinars } from "@/lib/webinars";

export async function GET() {
  const webinars = await listWebinars();
  return NextResponse.json({ webinars });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const title: string | undefined = body?.title;

  if (!title || !title.trim()) {
    return NextResponse.json({ error: "`title` is required" }, { status: 400 });
  }

  const webinar = await createWebinar(title.trim());
  return NextResponse.json({ webinar }, { status: 201 });
}
