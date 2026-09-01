"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  CalendarDays,
  X,
  AlertCircle,
} from "lucide-react";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  location: string | null;
  imageUrl: string | null;
  published: boolean;
};

const emptyForm = {
  title: "",
  description: "",
  startAt: "",
  endAt: "",
  location: "",
  imageUrl: "",
  published: true,
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function EventsPage() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/events");
    const data = await res.json().catch(() => ({ events: [] }));
    setRows(data.events ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch("/api/admin/events");
      const data = await res.json().catch(() => ({ events: [] }));
      if (!alive) return;
      setRows(data.events ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((ev) =>
      [ev.title, ev.location, ev.description]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [rows, query]);

  function openAdd() {
    setEditing(null);
    setForm({ ...emptyForm });
    setError("");
    setOpen(true);
  }

  function openEdit(ev: EventRow) {
    setEditing(ev);
    setForm({
      title: ev.title ?? "",
      description: ev.description ?? "",
      startAt: toLocalInput(ev.startAt),
      endAt: toLocalInput(ev.endAt),
      location: ev.location ?? "",
      imageUrl: ev.imageUrl ?? "",
      published: ev.published,
    });
    setError("");
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!form.startAt) {
      setError("Start date/time is required");
      return;
    }
    setSaving(true);
    setError("");
    const payload = { ...form, endAt: form.endAt || null };
    const res = await fetch(
      editing ? `/api/admin/events/${editing.id}` : "/api/admin/events",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save event");
    }
  }

  async function remove(ev: EventRow) {
    if (!confirm(`Delete event "${ev.title}"?`)) return;
    const res = await fetch(`/api/admin/events/${ev.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-page-titles">
          <h1 className="admin-h1">Events</h1>
          <p className="admin-sub">Festivals, sevas &amp; temple gatherings.</p>
        </div>
        <div className="admin-page-actions">
          <button type="button" className="admin-btn" onClick={openAdd}>
            <Plus aria-hidden="true" />
            Add event
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search className="admin-search-ico" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search title, location…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search events"
          />
        </div>
        {!loading ? (
          <span className="admin-count">
            {filtered.length} {filtered.length === 1 ? "event" : "events"}
          </span>
        ) : null}
      </div>

      <div className="admin-panel">
        {loading ? (
          <div className="admin-table-loading">Loading events…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            <span className="admin-empty-ico">
              <CalendarDays aria-hidden="true" />
            </span>
            {rows.length === 0 ? (
              <>
                <strong>No events yet</strong>
                <span>Add the first temple event.</span>
              </>
            ) : (
              <>
                <strong>No matches</strong>
                <span>No events match “{query}”.</span>
              </>
            )}
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>When</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <span className="admin-cell-name">{ev.title}</span>
                    </td>
                    <td>{fmt(ev.startAt)}</td>
                    <td>
                      {ev.location || <span className="admin-muted">—</span>}
                    </td>
                    <td>
                      <span
                        className={`admin-tag ${ev.published ? "is-published" : "is-draft"}`}
                      >
                        <span className="admin-tag-dot" aria-hidden="true" />
                        {ev.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-iconbtn"
                          onClick={() => openEdit(ev)}
                          aria-label={`Edit ${ev.title}`}
                          title="Edit"
                        >
                          <Pencil aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="admin-iconbtn is-danger"
                          onClick={() => remove(ev)}
                          aria-label={`Delete ${ev.title}`}
                          title="Delete"
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open ? (
        <div className="admin-modal-backdrop" onClick={() => setOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h2>{editing ? "Edit event" : "Add event"}</h2>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={save}>
              <div className="admin-modal-body">
                <div className="admin-field">
                  <label>Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    autoFocus
                    required
                  />
                </div>
                <div className="admin-field">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <div className="admin-field-row">
                  <div className="admin-field">
                    <label>Starts *</label>
                    <input
                      type="datetime-local"
                      value={form.startAt}
                      onChange={(e) =>
                        setForm({ ...form, startAt: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="admin-field">
                    <label>Ends</label>
                    <input
                      type="datetime-local"
                      value={form.endAt}
                      onChange={(e) => setForm({ ...form, endAt: e.target.value })}
                    />
                  </div>
                </div>
                <div className="admin-field">
                  <label>Location</label>
                  <input
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                  />
                </div>
                <div className="admin-field">
                  <label>Image URL</label>
                  <input
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm({ ...form, imageUrl: e.target.value })
                    }
                  />
                </div>
                <div className="admin-field admin-checkbox">
                  <input
                    id="published"
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) =>
                      setForm({ ...form, published: e.target.checked })
                    }
                  />
                  <label htmlFor="published" style={{ margin: 0 }}>
                    Published (visible on the website)
                  </label>
                </div>
                {error ? (
                  <p className="admin-error">
                    <AlertCircle aria-hidden="true" />
                    {error}
                  </p>
                ) : null}
                <div className="admin-modal-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-ghost"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="admin-btn" disabled={saving}>
                    {saving ? "Saving…" : editing ? "Save changes" : "Add event"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
