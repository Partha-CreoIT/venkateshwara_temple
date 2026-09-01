// Server-side client for the rbac-db auth/RBAC backend (Go service).
const BASE = process.env.RBAC_API_URL ?? "http://localhost:8080/api/v1";

export type RbacTokens = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
};

export type Role = "super_admin" | "trust_admin" | "user";

export type Actor = {
  id: string;
  email: string;
  role: Role;
  trustId?: string | null;
  firstName?: string;
  lastName?: string;
  status?: string;
};

export class RbacError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function rbacLogin(email: string, password: string): Promise<RbacTokens> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new RbacError(res.status === 401 ? 401 : res.status, "Invalid email or password");
  }
  return (await res.json()) as RbacTokens;
}

export async function rbacRefresh(refreshToken: string): Promise<RbacTokens | null> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as RbacTokens;
  } catch {
    return null;
  }
}

export async function rbacLogout(refreshToken: string): Promise<void> {
  try {
    await fetch(`${BASE}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
  } catch {
    // best effort
  }
}

export async function rbacMe(accessToken: string): Promise<Actor | null> {
  try {
    const res = await fetch(`${BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const u = (await res.json()) as {
      id: string;
      email: string;
      role: Role;
      trust_id?: string | null;
      first_name?: string;
      last_name?: string;
      status?: string;
    };
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      trustId: u.trust_id ?? null,
      firstName: u.first_name,
      lastName: u.last_name,
      status: u.status,
    };
  } catch {
    return null;
  }
}
