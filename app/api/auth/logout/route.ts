import { NextResponse } from "next/server";
import { clearAuthCookies } from "../../../../lib/auth";
import { rbacLogout } from "../../../../lib/rbac";

export async function POST() {
  const refresh = await clearAuthCookies();
  if (refresh) {
    await rbacLogout(refresh);
  }
  return NextResponse.json({ ok: true });
}
