"use client";

import { useState } from "react";

export function PasswordModal({
  open,
  onSave,
  onLater,
  onClose,
  allowLater = false,
}: {
  open: boolean;
  onSave: (password: string) => Promise<void>;
  onLater?: () => Promise<void> | void;
  onClose?: () => void;
  allowLater?: boolean;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);

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

  const later = async () => {
    if (!onLater) return;
    setError("");
    setSkipping(true);
    try {
      await onLater();
      setPassword("");
      setConfirm("");
    } catch {
      setError("Could not save your preference");
    } finally {
      setSkipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/45 p-5 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-md animate-fade-rise overflow-hidden rounded-4xl bg-ink p-8 text-white shadow-soft"
      >
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-cu-yellow">
          {allowLater ? "First-time setup" : "Account security"}
        </p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight">
          {allowLater ? "Set a new password" : "Change password"}
        </h2>
        <p className="mt-2 text-sm font-medium text-white/60">
          {allowLater
            ? "Please change your temporary password after first login. You can also do this later from the navigation bar."
            : "Choose a new password for your Partner Portal account."}
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
        <div
          className={`mt-5 grid gap-3 ${
            allowLater || onClose ? "sm:grid-cols-2" : ""
          }`}
        >
          {allowLater ? (
            <button
              type="button"
              disabled={loading || skipping}
              onClick={() => void later()}
              className="h-12 rounded-full border-2 border-white/25 font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              {skipping ? "Saving…" : "I'll do it later"}
            </button>
          ) : onClose ? (
            <button
              type="button"
              disabled={loading || skipping}
              onClick={onClose}
              className="h-12 rounded-full border-2 border-white/25 font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={loading || skipping}
            className={`h-12 rounded-full bg-cu-red font-bold text-white shadow-red transition hover:bg-cu-red-dark disabled:opacity-60 ${
              !allowLater && !onClose ? "w-full" : ""
            }`}
          >
            {loading ? "Saving…" : "Save password"}
          </button>
        </div>
      </form>
    </div>
  );
}
