import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, members } from "../../../../db";
import { guardAdmin } from "../../../../lib/api-guard";

export async function GET() {
  const denied = await guardAdmin();
  if (denied) return denied;
  const rows = await db.select().from(members).orderBy(desc(members.createdAt));
  return NextResponse.json({ members: rows });
}

export async function POST(req: Request) {
  const denied = await guardAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const [row] = await db
    .insert(members)
    .values({
      name: body.name.trim(),
      phone: body.phone || null,
      email: body.email || null,
      family: body.family || null,
      membershipType: body.membershipType || "general",
      address: body.address || null,
      joinedAt: body.joinedAt || null,
      notes: body.notes || null,
    })
    .returning();

  return NextResponse.json({ member: row }, { status: 201 });
}
