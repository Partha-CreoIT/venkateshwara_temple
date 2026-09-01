import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, members } from "../../../../../db";
import { guardAdmin } from "../../../../../lib/api-guard";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const [row] = await db
    .update(members)
    .set({
      name: body.name?.trim() || undefined,
      phone: body.phone ?? undefined,
      email: body.email ?? undefined,
      family: body.family ?? undefined,
      membershipType: body.membershipType || undefined,
      address: body.address ?? undefined,
      joinedAt: body.joinedAt ?? undefined,
      notes: body.notes ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(members.id, id))
    .returning();

  if (!row) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  return NextResponse.json({ member: row });
}

export async function DELETE(_req: Request, { params }: Params) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const { id } = await params;
  const [row] = await db.delete(members).where(eq(members.id, id)).returning();
  if (!row) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
