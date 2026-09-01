"use client";

import { useEffect, useState } from "react";

type ApiEvent = {
  id: string;
  name: string;
  details: string | null;
  start_time: string;
  end_time: string | null;
};

// Public, read-only events feed (rbac-db). Override for other environments.
const EVENTS_API =
  process.env.NEXT_PUBLIC_EVENTS_API_URL ?? "http://localhost:8080/api/v1";

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
};
const TIME_OPTS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

// "Sat, Sep 6, 6:00 PM – 8:00 PM" (same day) or with both dates across days.
function formatRange(startISO: string, endISO: string | null): string {
  const start = new Date(startISO);
  const startDate = start.toLocaleDateString(undefined, DATE_OPTS);
  const startTime = start.toLocaleTimeString(undefined, TIME_OPTS);
  if (!endISO) return `${startDate}, ${startTime}`;
  const end = new Date(endISO);
  const endTime = end.toLocaleTimeString(undefined, TIME_OPTS);
  if (start.toDateString() === end.toDateString()) {
    return `${startDate}, ${startTime} – ${endTime}`;
  }
  return `${startDate}, ${startTime} – ${end.toLocaleDateString(undefined, DATE_OPTS)}, ${endTime}`;
}

// "Today" / "Tomorrow" / "in 3 days" (calendar-day difference).
function relativeLabel(startISO: string): string {
  const start = new Date(startISO);
  const now = new Date();
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((startDay.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 1 ? `in ${days} days` : `${-days} days ago`;
}

export function UpcomingEvents() {
  const [events, setEvents] = useState<ApiEvent[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${EVENTS_API}/events`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        const list: ApiEvent[] = Array.isArray(data) ? data : [];
        list.sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
        );
        setEvents(list);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="events-section" id="events">
      <header className="events-head">
        <p className="events-eyebrow">ಕಾರ್ಯಕ್ರಮಗಳು · Events</p>
        <h2 className="events-title">Upcoming Events</h2>
        <p className="events-subtitle">
          Festivals, sevas and gatherings at the temple.
        </p>
      </header>

      {failed ? (
        <div className="events-state">
          Could not load events right now. Please try again later.
        </div>
      ) : events === null ? (
        <div className="events-state">
          <span className="events-spinner" aria-hidden="true" />
          Loading events…
        </div>
      ) : events.length === 0 ? (
        <div className="events-state">No upcoming events.</div>
      ) : (
        <ul className="events-grid">
          {events.map((ev) => (
            <li key={ev.id} className="event-card">
              <span className="event-badge">{relativeLabel(ev.start_time)}</span>
              <h3 className="event-name">{ev.name}</h3>
              <p className="event-when">{formatRange(ev.start_time, ev.end_time)}</p>
              {ev.details ? <p className="event-details">{ev.details}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
