"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
      } else {
        setError(data.error || "Login failed");
        setBusy(false);
      }
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <div className="admin-login-card">
      <div className="admin-login-mark" aria-hidden="true">
        ॐ
      </div>
      <h1>Temple Admin</h1>
      <p>Sign in to manage members &amp; events</p>
      <form onSubmit={onSubmit}>
        <div className="admin-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="admin-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error ? <p className="admin-error">{error}</p> : null}
        <button type="submit" className="admin-btn admin-btn-block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="admin-login-note">Sri Lakshmi Venkataramana Devamandira · Shivamogga</p>
    </div>
  );
}
