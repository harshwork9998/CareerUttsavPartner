"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export function ResetPasswordView({ token }: { token: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setValid(false);
        setChecking(false);
        return;
      }
      try {
        const res = await fetch(
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`
        );
        if (!cancelled) setValid(res.ok);
      } catch {
        if (!cancelled) setValid(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not reset password");
        if (res.status === 400) setValid(false);
        return;
      }
      router.replace("/login?reset=success");
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-paper/70 via-transparent to-paper" />

      <div className="cu-wrap relative z-10 flex h-full items-center justify-center py-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 0.84, 0.44, 1] }}
          className="w-full max-w-[420px]"
        >
          <div className="mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/career-uttsav-logo.png"
              alt="Career Uttsav"
              className="h-16 w-auto sm:h-20"
            />
          </div>

          <div className="overflow-hidden rounded-[22px] bg-ink px-6 py-6 text-white shadow-soft sm:px-7 sm:py-7">
            {checking ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-cu-yellow" />
              </div>
            ) : !valid ? (
              <>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-cu-yellow">
                  Link expired
                </p>
                <h1 className="mt-2 font-display text-3xl font-bold leading-none tracking-tight">
                  This reset link isn&apos;t valid
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-white/60">
                  It may have expired after 30 minutes or already been used.
                  Request a fresh link to continue.
                </p>
                <Link
                  href="/forgot-password"
                  className="mt-6 flex h-10 w-full items-center justify-center rounded-full bg-cu-red text-sm font-bold text-white shadow-red transition hover:-translate-y-0.5 hover:bg-cu-red-dark"
                >
                  Request a new reset link
                </Link>
                <Link
                  href="/login"
                  className="mt-4 block text-center text-xs font-semibold text-white/55 transition hover:text-cu-yellow"
                >
                  Back to login
                </Link>
              </>
            ) : (
              <>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-cu-yellow">
                  Choose a new password
                </p>
                <h1 className="mt-2 font-display text-3xl font-bold leading-none tracking-tight">
                  Reset password
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-white/60">
                  Create a new password for your Partner Portal account. Use at
                  least 8 characters.
                </p>

                <div className="relative my-5 border-t-2 border-dashed border-white/20">
                  <span className="absolute -left-9 -top-[9px] h-[18px] w-[18px] rounded-full bg-paper" />
                  <span className="absolute -right-9 -top-[9px] h-[18px] w-[18px] rounded-full bg-paper" />
                </div>

                <form onSubmit={submit} className="space-y-3">
                  {error ? (
                    <p className="rounded-lg bg-cu-red/20 px-3 py-1.5 text-xs font-semibold text-[#ffb4ae]">
                      {error}
                    </p>
                  ) : null}

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-white/50"
                    >
                      New password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 pr-10 text-sm text-white outline-none transition focus:border-cu-yellow focus:bg-white/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/50 hover:text-white"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm"
                      className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-white/50"
                    >
                      Confirm password
                    </label>
                    <div className="relative">
                      <input
                        id="confirm"
                        type={showConfirm ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                        minLength={8}
                        className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 pr-10 text-sm text-white outline-none transition focus:border-cu-yellow focus:bg-white/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label={
                          showConfirm ? "Hide password" : "Show password"
                        }
                        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/50 hover:text-white"
                      >
                        {showConfirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 flex h-10 w-full items-center justify-center rounded-full bg-cu-red text-sm font-bold text-white shadow-red transition hover:-translate-y-0.5 hover:bg-cu-red-dark disabled:opacity-60"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Update password"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
