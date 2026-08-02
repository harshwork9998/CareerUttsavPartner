"use client";

import { useState } from "react";

export function PasswordModal({
  open,
  onSave,
}: {
  open: boolean;
  onSave: (password: string) => Promise<void>;
  onSkip?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Use at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await onSave(password);
      setPassword("");
      setConfirm("");
    } catch {
      setError("Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 p-5 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-md animate-fade-rise overflow-hidden rounded-4xl bg-ink p-8 text-white shadow-soft"
      >
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-cu-yellow">
          First-time setup
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight">
          Set a new password
        </h2>
        <p className="mt-2 text-sm font-medium text-white/60">
          Please change your temporary password after first login.
        </p>
        {error ? (
          <p className="mt-4 rounded-xl bg-cu-red/20 px-3 py-2 text-sm font-semibold text-[#ffb4ae]">
            {error}
          </p>
        ) : null}
        <div className="mt-6 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            minLength={8}
            required
            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-cu-yellow"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            minLength={8}
            required
            className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-cu-yellow"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-5 h-12 w-full rounded-full bg-cu-red font-bold text-white shadow-red transition hover:bg-cu-red-dark disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save password"}
        </button>
      </form>
    </div>
  );
}
