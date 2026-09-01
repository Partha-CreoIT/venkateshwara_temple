"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, CalendarDays, Plus } from "lucide-react";

export default function AdminDashboard() {
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [publishedCount, setPublishedCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/members")
      .then((r) => (r.ok ? r.json() : { members: [] }))
      .then((d) => setMemberCount(d.members?.length ?? 0))
      .catch(() => setMemberCount(0));
    fetch("/api/admin/events")
      .then((r) => (r.ok ? r.json() : { events: [] }))
      .then((d) => {
        const events = d.events ?? [];
        setEventCount(events.length);
        setPublishedCount(
          events.filter((e: { published?: boolean }) => e.published).length,
        );
      })
      .catch(() => {
        setEventCount(0);
        setPublishedCount(0);
      });
  }, []);

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-page-titles">
          <h1 className="admin-h1">Dashboard</h1>
          <p className="admin-sub">
            Manage the temple member directory and upcoming events.
          </p>
        </div>
      </div>

      <div className="admin-cards">
        <Link className="admin-stat" href="/admin/members">
          <span className="admin-stat-ico">
            <Users aria-hidden="true" />
          </span>
          <span className="admin-stat-body">
            <span className="admin-stat-num">{memberCount ?? "—"}</span>
            <span className="admin-stat-label">Members</span>
          </span>
        </Link>

        <Link className="admin-stat" href="/admin/events">
          <span className="admin-stat-ico">
            <CalendarDays aria-hidden="true" />
          </span>
          <span className="admin-stat-body">
            <span className="admin-stat-num">{eventCount ?? "—"}</span>
            <span className="admin-stat-label">Events</span>
            {publishedCount !== null ? (
              <span className="admin-stat-foot">{publishedCount} published</span>
            ) : null}
          </span>
        </Link>
      </div>

      <h2 className="admin-section-title">Quick actions</h2>
      <div className="admin-quick">
        <Link className="admin-quick-btn" href="/admin/members">
          <Plus aria-hidden="true" />
          Add a member
        </Link>
        <Link className="admin-quick-btn" href="/admin/events">
          <Plus aria-hidden="true" />
          Add an event
        </Link>
      </div>
    </div>
  );
}
