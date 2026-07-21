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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-5 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-md animate-fade-rise rounded-3xl border border-line-subtle bg-white p-7 shadow-soft"
      >
        <h2 className="font-display text-2xl font-bold text-brand-800">
          Set a new password
        </h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Please change your temporary password after first login.
        </p>
        {error ? (
          <p className="mt-3 text-sm font-semibold text-red-700">{error}</p>
        ) : null}
        <div className="mt-5 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            minLength={8}
            required
            className="h-11 w-full rounded-xl border border-line-strong px-3 outline-none focus:border-brand-500"
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            minLength={8}
            required
            className="h-11 w-full rounded-xl border border-line-strong px-3 outline-none focus:border-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-4 h-11 w-full rounded-full bg-brand-700 font-semibold text-white disabled:opacity-60"
        >
          Save password
        </button>
      </form>
    </div>
  );
}
