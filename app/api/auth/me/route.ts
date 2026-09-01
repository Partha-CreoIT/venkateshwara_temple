import { NextResponse } from "next/server";
import { resolveActor, isAdmin } from "../../../../lib/auth";

export async function GET() {
  const actor = await resolveActor();
  if (!isAdmin(actor)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    actor: {
      id: actor.id,
      email: actor.email,
      role: actor.role,
      firstName: actor.firstName ?? "",
      lastName: actor.lastName ?? "",
    },
  });
}
