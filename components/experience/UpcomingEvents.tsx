"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { all, DUR, EASE, reducedMotion, reveal, revealLines } from "../../lib/motion";

gsap.registerPlugin(ScrollTrigger, useGSAP);

type ApiEvent = {
  id: string;
  name: string;
  details: string | null;
  start_time: string;
  end_time: string | null;
};

// Public, read-only events feed (rbac-db). Override for other environments.
const EVENTS_API =
  process.env.NEXT_PUBLIC_EVENTS_API_URL ?? "https://vtemple-api-4.creox.dev/api/v1";

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
function relativeLabel(startISO: string, nowMs: number): string {
  const start = new Date(startISO);
  const now = new Date(nowMs);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((startDay.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  return days > 1 ? `in ${days} days` : `${-days} days ago`;
}

/** The moment an event stops being upcoming — its end, or its start if open-ended. */
function closesAt(event: ApiEvent): number {
  return new Date(event.end_time ?? event.start_time).getTime();
}

type Countdown = {
  /** Rendered as three tiles; the unit set narrows as the event approaches. */
  parts: { value: number; unit: string }[];
  live: boolean;
};

function countdownTo(startISO: string, endISO: string | null, now: number): Countdown | null {
  const start = new Date(startISO).getTime();
  const end = endISO ? new Date(endISO).getTime() : start;
  if (now >= start) {
    // Already begun. Only worth saying so while it is still running.
    return now <= end ? { parts: [], live: true } : null;
  }

  const total = Math.floor((start - now) / 1000);
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const seconds = total % 60;

  // Drop the coarsest unit once it reads zero, so the last day counts down in
  // seconds rather than showing a dead "00 DAYS" tile.
  const parts = days > 0
    ? [
        { value: days, unit: days === 1 ? "day" : "days" },
        { value: hours, unit: "hrs" },
        { value: minutes, unit: "min" },
      ]
    : [
        { value: hours, unit: "hrs" },
        { value: minutes, unit: "min" },
        { value: seconds, unit: "sec" },
      ];
  return { parts, live: false };
}

/**
 * One ticking clock for the whole section, driving the countdown, the relative
 * labels and which event leads. Exposed as an external store so reading it
 * keeps render pure, and so the server snapshot is an explicit "no clock yet"
 * rather than a timestamp that could not survive hydration.
 */
function subscribeToSecond(onChange: () => void): () => void {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

function useNow(): number | null {
  return useSyncExternalStore(
    subscribeToSecond,
    // Rounded to the second so repeated reads within a tick are identical,
    // which is what useSyncExternalStore requires of a snapshot.
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );
}

function EventCountdown({ event, now }: { event: ApiEvent; now: number | null }) {
  // `now` stays null until the client clock reports, which keeps the first
  // paint free of a time that would differ between render and hydration.
  if (now === null) return null;
  const countdown = countdownTo(event.start_time, event.end_time, now);
  if (!countdown) return null;

  if (countdown.live) {
    return (
      <p className="event-hero-live">
        <span className="event-hero-live-dot" aria-hidden="true" />
        Happening now
      </p>
    );
  }

  return (
    <div className="event-hero-countdown">
      <ul className="countdown-tiles">
        {countdown.parts.map((part) => (
          <li key={part.unit} className="countdown-tile">
            <span className="countdown-value">
              {String(part.value).padStart(2, "0")}
            </span>
            <span className="countdown-unit">{part.unit}</span>
          </li>
        ))}
      </ul>
      <span className="countdown-caption">until it begins</span>
    </div>
  );
}

export function UpcomingEvents() {
  const [events, setEvents] = useState<ApiEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const rootRef = useRef<HTMLElement | null>(null);
  const now = useNow();

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

  useGSAP(
    () => {
      if (!events?.length || reducedMotion()) {
        return;
      }
      const root = rootRef.current;
      // No explicit ScrollTrigger.refresh() here: each trigger measures itself
      // on creation, and forcing a global refresh would re-measure the pinned
      // scroll film above this section for no gain.
      const cleanups = [
        revealLines(root?.querySelector(".events-title") ?? null),
        reveal(root?.querySelector(".events-head") ?? null, {
          children: ".events-eyebrow, .kalasha-rule, .events-subtitle",
        }),
        reveal(root?.querySelector(".event-hero") ?? null, {
          y: 42,
          duration: DUR.slow,
        }),
        // One trigger over the whole thread, staggered — not a trigger per
        // row. The medallions ride the same stagger as their copy so a row
        // arrives as one object rather than as two things that happen to
        // agree, and they use the shared ease: an overshoot here would be the
        // only bounce on the site.
        reveal(root?.querySelector(".events-thread") ?? null, {
          children: ".thread-event",
          y: 26,
          start: "top 85%",
        }),
        reveal(root?.querySelector(".events-thread") ?? null, {
          children: ".thread-medallion",
          y: 0,
          scale: 0.72,
          start: "top 85%",
        }),
      ];

      // The thread is drawn top-down so the timeline reads as a line being
      // traced past each medallion rather than appearing all at once.
      const line = gsap.from(".events-thread-line", {
        scaleY: 0,
        transformOrigin: "top center",
        duration: DUR.slow,
        ease: EASE,
        scrollTrigger: { trigger: ".events-thread", start: "top 85%", once: true },
      });

      return all(...cleanups, () => {
        line.scrollTrigger?.kill();
        line.kill();
      });
    },
    { scope: rootRef, dependencies: [events] },
  );

  // The nearest event that has not finished leads the section; anything that
  // has already closed keeps its place in the thread but reads as past. Before
  // the clock reports, the first event leads — the feed arrives from a fetch,
  // so in practice the clock is always running by the time there is a list.
  const featuredIndex =
    now === null ? 0 : (events?.findIndex((ev) => closesAt(ev) >= now) ?? -1);
  const featured =
    events && events.length
      ? events[featuredIndex >= 0 ? featuredIndex : events.length - 1]
      : null;
  const rest = events?.filter((ev) => ev !== featured) ?? [];

  return (
    <section className="events-section" id="events" ref={rootRef}>
      <div className="events-mandala" aria-hidden="true" />

      <header className="events-head">
        <p className="events-eyebrow">
          <span className="kn">ಕಾರ್ಯಕ್ರಮಗಳು</span> · Events
        </p>
        <h2 className="events-title">Upcoming Events</h2>
        <span className="kalasha-rule is-centered" aria-hidden="true" />
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
        <div className="events-body">
          {featured ? (
            <article
              className={`event-hero ${
                now !== null && closesAt(featured) < now ? "is-past" : ""
              }`}
            >
              <span className="event-hero-glow" aria-hidden="true" />
              <div className="event-hero-top">
                <p className="event-hero-eyebrow">
                  <span className="event-hero-star" aria-hidden="true">
                    ✦
                  </span>
                  Next at the temple
                </p>
                {now !== null ? (
                  <span className="event-hero-badge">
                    {relativeLabel(featured.start_time, now)}
                  </span>
                ) : null}
              </div>
              <h3 className="event-hero-name">{featured.name}</h3>
              <span className="kalasha-rule is-short" aria-hidden="true" />
              <p className="event-hero-when">
                {formatRange(featured.start_time, featured.end_time)}
              </p>
              {featured.details ? (
                <p className="event-hero-details">{featured.details}</p>
              ) : null}
              <EventCountdown event={featured} now={now} />
            </article>
          ) : null}

          {rest.length ? (
            <ol className="events-thread">
              <span className="events-thread-line" aria-hidden="true" />
              {rest.map((ev) => {
                const start = new Date(ev.start_time);
                return (
                  <li
                    key={ev.id}
                    className={`thread-event ${
                      now !== null && closesAt(ev) < now ? "is-past" : ""
                    }`}
                  >
                    <div className="thread-medallion" aria-hidden="true">
                      <span className="thread-month">
                        {start.toLocaleDateString(undefined, { month: "short" })}
                      </span>
                      <span className="thread-day">
                        {String(start.getDate()).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="thread-body">
                      <div className="thread-top">
                        <h3 className="thread-name">{ev.name}</h3>
                        {now !== null ? (
                          <span className="thread-rel">
                            {relativeLabel(ev.start_time, now)}
                          </span>
                        ) : null}
                      </div>
                      <p className="thread-when">
                        {formatRange(ev.start_time, ev.end_time)}
                      </p>
                      {ev.details ? (
                        <p className="thread-details">{ev.details}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </div>
      )}
    </section>
  );
}
