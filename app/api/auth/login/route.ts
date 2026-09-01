import { NextResponse } from "next/server";
import { rbacLogin, rbacMe, RbacError } from "../../../../lib/rbac";
import { setAuthCookies, isAdmin } from "../../../../lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = body?.email;
  const password = body?.password;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const tokens = await rbacLogin(email, password);
    const actor = await rbacMe(tokens.access_token);
    if (!isAdmin(actor)) {
      return NextResponse.json(
        { error: "This account does not have administrator access." },
        { status: 403 },
      );
    }
    await setAuthCookies(tokens);
    return NextResponse.json({ ok: true, actor: { email: actor.email, role: actor.role } });
  } catch (e) {
    if (e instanceof RbacError) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Auth service is unavailable. Is rbac-db running?" },
      { status: 502 },
    );
  }
}
