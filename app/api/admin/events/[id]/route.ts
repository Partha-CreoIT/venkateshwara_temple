import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, events } from "../../../../../db";
import { guardAdmin } from "../../../../../lib/api-guard";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const [row] = await db
    .update(events)
    .set({
      title: body.title?.trim() || undefined,
      description: body.description ?? undefined,
      startAt: body.startAt ? new Date(body.startAt) : undefined,
      endAt: body.endAt === undefined ? undefined : body.endAt ? new Date(body.endAt) : null,
      location: body.location ?? undefined,
      imageUrl: body.imageUrl ?? undefined,
      published: typeof body.published === "boolean" ? body.published : undefined,
      updatedAt: new Date(),
    })
    .where(eq(events.id, id))
    .returning();

  if (!row) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ event: row });
}

export async function DELETE(_req: Request, { params }: Params) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const [row] = await db.delete(events).where(eq(events.id, id)).returning();
  if (!row) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
