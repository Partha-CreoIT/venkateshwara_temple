import { cookies } from "next/headers";
import {
  type Actor,
  type RbacTokens,
  rbacMe,
  rbacRefresh,
} from "./rbac";

const ACCESS_COOKIE = "tb_access";
const REFRESH_COOKIE = "tb_refresh";
const ACCESS_MAX_AGE = 60 * 15; // 15m, matches rbac-db access TTL
const REFRESH_MAX_AGE = 60 * 60 * 168; // 7d

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export async function setAuthCookies(tokens: RbacTokens): Promise<void> {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, tokens.access_token, cookieOptions(ACCESS_MAX_AGE));
  jar.set(REFRESH_COOKIE, tokens.refresh_token, cookieOptions(REFRESH_MAX_AGE));
}

export async function clearAuthCookies(): Promise<string | undefined> {
  const jar = await cookies();
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
  return refresh;
}

/**
 * Resolve the current admin actor from cookies, transparently refreshing the
 * access token via rbac-db when it has expired. Must be called from a Route
 * Handler or Server Action (it may write cookies).
 */
export async function resolveActor(): Promise<Actor | null> {
  const jar = await cookies();
  const access = jar.get(ACCESS_COOKIE)?.value;
  if (access) {
    const actor = await rbacMe(access);
    if (actor) return actor;
  }
  const refresh = jar.get(REFRESH_COOKIE)?.value;
  if (refresh) {
    const tokens = await rbacRefresh(refresh);
    if (tokens) {
      await setAuthCookies(tokens);
      return rbacMe(tokens.access_token);
    }
  }
  return null;
}

export function isAdmin(actor: Actor | null): actor is Actor {
  return !!actor && (actor.role === "super_admin" || actor.role === "trust_admin");
}

export class AuthError extends Error {
  status: number;
  constructor(status: number) {
    super(status === 403 ? "Forbidden" : "Unauthorized");
    this.status = status;
  }
}

/** Throws AuthError(401/403) unless the caller is a signed-in admin. */
export async function requireAdmin(): Promise<Actor> {
  const actor = await resolveActor();
  if (!actor) throw new AuthError(401);
  if (!isAdmin(actor)) throw new AuthError(403);
  return actor;
}
