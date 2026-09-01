import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Soft gate: bounce /admin pages to the login screen when no auth cookies are
// present. Authoritative validation happens server-side in /api/auth/me and the
// admin API routes (which also refresh expired tokens).
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const hasAuth = req.cookies.has("tb_access") || req.cookies.has("tb_refresh");
    if (!hasAuth) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
