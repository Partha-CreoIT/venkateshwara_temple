import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, events } from "../../../../db";
import { guardAdmin } from "../../../../lib/api-guard";

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  const rows = await db.select().from(events).orderBy(desc(events.startAt));
  return NextResponse.json({ events: rows });
}

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!body?.startAt) {
    return NextResponse.json({ error: "Start date/time is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(events)
    .values({
      title: body.title.trim(),
      description: body.description || null,
      startAt: new Date(body.startAt),
      endAt: body.endAt ? new Date(body.endAt) : null,
      location: body.location || null,
      imageUrl: body.imageUrl || null,
      published: body.published ?? true,
    })
    .returning();

  return NextResponse.json({ event: row }, { status: 201 });
}
