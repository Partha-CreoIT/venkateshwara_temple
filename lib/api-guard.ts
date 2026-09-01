import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "./auth";

/**
 * Guards an admin API route. Returns null when the caller is an admin, or a
 * ready-to-return error response otherwise:
 *   const denied = await guardAdmin();
 *   if (denied) return denied;
 */
export async function guardAdmin(): Promise<NextResponse | null> {
  try {
    await requireAdmin();
    return null;
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 500;
    const error = status === 403 ? "Forbidden" : status === 401 ? "Unauthorized" : "Server error";
    return NextResponse.json({ error }, { status });
  }
}
