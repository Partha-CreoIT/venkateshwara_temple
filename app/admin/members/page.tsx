"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Users, X, AlertCircle } from "lucide-react";

type Member = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  family: string | null;
  membershipType: string;
  address: string | null;
  joinedAt: string | null;
  notes: string | null;
};

const MEMBERSHIP_TYPES = ["general", "life", "patron", "committee"];

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  family: "",
  membershipType: "general",
  address: "",
  joinedAt: "",
  notes: "",
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters =
    parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

export default function MembersPage() {
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/members");
    const data = await res.json().catch(() => ({ members: [] }));
    setRows(data.members ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch("/api/admin/members");
      const data = await res.json().catch(() => ({ members: [] }));
      if (!alive) return;
      setRows(data.members ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((m) =>
      [m.name, m.phone, m.email, m.family, m.membershipType]
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

  function openEdit(m: Member) {
    setEditing(m);
    setForm({
      name: m.name ?? "",
      phone: m.phone ?? "",
      email: m.email ?? "",
      family: m.family ?? "",
      membershipType: m.membershipType ?? "general",
      address: m.address ?? "",
      joinedAt: m.joinedAt ? m.joinedAt.slice(0, 10) : "",
      notes: m.notes ?? "",
    });
    setError("");
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    const payload = { ...form, joinedAt: form.joinedAt || null };
    const res = await fetch(
      editing ? `/api/admin/members/${editing.id}` : "/api/admin/members",
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
      setError(data.error || "Could not save member");
    }
  }

  async function remove(m: Member) {
    if (!confirm(`Delete member "${m.name}"?`)) return;
    const res = await fetch(`/api/admin/members/${m.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-page-titles">
          <h1 className="admin-h1">Members</h1>
          <p className="admin-sub">Temple &amp; samaja member directory.</p>
        </div>
        <div className="admin-page-actions">
          <button type="button" className="admin-btn" onClick={openAdd}>
            <Plus aria-hidden="true" />
            Add member
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search className="admin-search-ico" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search name, phone, family…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search members"
          />
        </div>
        {!loading ? (
          <span className="admin-count">
            {filtered.length} {filtered.length === 1 ? "member" : "members"}
          </span>
        ) : null}
      </div>

      <div className="admin-panel">
        {loading ? (
          <div className="admin-table-loading">Loading members…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">
            <span className="admin-empty-ico">
              <Users aria-hidden="true" />
            </span>
            {rows.length === 0 ? (
              <>
                <strong>No members yet</strong>
                <span>Add the first member of the directory.</span>
              </>
            ) : (
              <>
                <strong>No matches</strong>
                <span>No members match “{query}”.</span>
              </>
            )}
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Type</th>
                  <th>Family</th>
                  <th>Joined</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="admin-cell-user">
                        <span className="admin-avatar-sm" aria-hidden="true">
                          {initialsOf(m.name)}
                        </span>
                        <span className="admin-cell-text">
                          <span className="admin-cell-name">{m.name}</span>
                          {m.email ? (
                            <span className="admin-cell-sub">{m.email}</span>
                          ) : null}
                        </span>
                      </div>
                    </td>
                    <td>{m.phone || <span className="admin-muted">—</span>}</td>
                    <td>
                      <span className={`admin-tag is-${m.membershipType}`}>
                        {m.membershipType}
                      </span>
                    </td>
                    <td>{m.family || <span className="admin-muted">—</span>}</td>
                    <td>
                      {m.joinedAt ? (
                        m.joinedAt.slice(0, 10)
                      ) : (
                        <span className="admin-muted">—</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="admin-iconbtn"
                          onClick={() => openEdit(m)}
                          aria-label={`Edit ${m.name}`}
                          title="Edit"
                        >
                          <Pencil aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="admin-iconbtn is-danger"
                          onClick={() => remove(m)}
                          aria-label={`Delete ${m.name}`}
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
              <h2>{editing ? "Edit member" : "Add member"}</h2>
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
                  <label>Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    autoFocus
                    required
                  />
                </div>
                <div className="admin-field-row">
                  <div className="admin-field">
                    <label>Phone</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                  <div className="admin-field">
                    <label>Email</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="admin-field-row">
                  <div className="admin-field">
                    <label>Membership type</label>
                    <select
                      value={form.membershipType}
                      onChange={(e) =>
                        setForm({ ...form, membershipType: e.target.value })
                      }
                    >
                      {MEMBERSHIP_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-field">
                    <label>Joined date</label>
                    <input
                      type="date"
                      value={form.joinedAt}
                      onChange={(e) =>
                        setForm({ ...form, joinedAt: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="admin-field">
                  <label>Family</label>
                  <input
                    value={form.family}
                    onChange={(e) => setForm({ ...form, family: e.target.value })}
                  />
                </div>
                <div className="admin-field">
                  <label>Address</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>
                <div className="admin-field">
                  <label>Notes</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
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
                    {saving ? "Saving…" : editing ? "Save changes" : "Add member"}
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
