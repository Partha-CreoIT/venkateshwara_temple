"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, CalendarDays, LogOut } from "lucide-react";
import "./admin.css";

type Actor = { email: string; role: string };

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/events", label: "Events", icon: CalendarDays },
];

function initialsOf(email: string): string {
  const name = email.split("@")[0] ?? email;
  const parts = name.split(/[._-]+/).filter(Boolean);
  const letters =
    parts.length >= 2 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return letters.toUpperCase();
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const [actor, setActor] = useState<Actor | null>(null);
  const [checking, setChecking] = useState(!isLogin);

  useEffect(() => {
    if (isLogin) return;
    let alive = true;
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!alive) return;
        if (r.ok) {
          const data = await r.json();
          setActor(data.actor);
          setChecking(false);
        } else {
          router.replace("/admin/login");
        }
      })
      .catch(() => alive && router.replace("/admin/login"));
    return () => {
      alive = false;
    };
  }, [isLogin, pathname, router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  if (isLogin) {
    return <div className="admin-auth">{children}</div>;
  }

  if (checking) {
    return (
      <div className="admin-loading">
        <span className="admin-spinner" aria-hidden="true" />
        <span>Loading…</span>
      </div>
    );
  }

  const current =
    NAV.find((n) =>
      n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href),
    )?.label ?? "Dashboard";

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark" aria-hidden="true">
            ॐ
          </span>
          <span className="admin-brand-text">
            <span className="admin-brand-name">Sri Lakshmi Venkataramana</span>
            <span className="admin-brand-sub">Temple Admin</span>
          </span>
        </div>

        <p className="admin-nav-label">Manage</p>
        <nav className="admin-nav">
          {NAV.map((n) => {
            const active =
              n.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(n.href);
            const Icon = n.icon;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`admin-nav-link${active ? " is-active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="admin-nav-ico" aria-hidden="true" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="admin-side-foot">
          Panchavathi Colony
          <br />
          Shivamogga, Karnataka
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <nav className="admin-crumb" aria-label="Breadcrumb">
            <span>Temple Admin</span>
            <span className="admin-crumb-sep" aria-hidden="true">
              ›
            </span>
            <span className="admin-crumb-cur">{current}</span>
          </nav>

          <div className="admin-topbar-right">
            <div className="admin-user">
              <span className="admin-avatar" aria-hidden="true">
                {actor ? initialsOf(actor.email) : "?"}
              </span>
              <span className="admin-user-meta">
                <span className="admin-user-email">{actor?.email}</span>
                {actor?.role ? (
                  <span className="admin-role">{actor.role.replace(/_/g, " ")}</span>
                ) : null}
              </span>
            </div>
            <button type="button" className="admin-logout" onClick={logout}>
              <LogOut aria-hidden="true" />
              Log out
            </button>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
