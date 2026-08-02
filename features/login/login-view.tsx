"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export function LoginView({
  resetSuccess = false,
}: {
  resetSuccess?: boolean;
}) {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage] = useState(
    resetSuccess
      ? "Your password has been reset successfully. Please sign in."
      : ""
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sign in failed");
        return;
      }
      router.refresh();
      router.replace("/dashboard");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-dvh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-paper/70 via-transparent to-paper" />

      <div className="cu-wrap relative z-10 grid h-full items-center gap-8 py-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 0.84, 0.44, 1] }}
          className="max-w-xl"
        >
          <div className="mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/career-uttsav-logo.png"
              alt="Career Uttsav"
              className="h-20 w-auto sm:h-24 lg:h-28"
            />
          </div>

          <h1 className="font-display text-[clamp(2.1rem,4.8vw,3.75rem)] font-bold leading-[0.98] tracking-[-0.02em]">
            Your dedicated{" "}
            <em className="not-italic text-cu-red">event workspace</em>
          </h1>
          <p className="mt-4 max-w-md text-base font-medium leading-relaxed text-ink-soft">
            Track sponsorship deliverables, upload marketing assets and manage
            seminar details through your dedicated Partner Portal.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 22, rotate: 1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 0.84, 0.44, 1] }}
          className="w-full max-w-[380px] justify-self-center lg:justify-self-end"
        >
          <form
            onSubmit={submit}
            className="relative overflow-hidden rounded-[22px] bg-ink px-6 py-5 text-white shadow-soft sm:px-7 sm:py-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold leading-none">
                  Partner login
                </h2>
              </div>
              <span className="rounded-full bg-cu-red px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em]">
                Portal
              </span>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-white/60">
              Sign in with the credentials sent to you by the Career Uttsav team.
            </p>

            <div className="relative mb-4 border-t-2 border-dashed border-white/20">
              <span className="absolute -left-9 -top-[9px] h-[18px] w-[18px] rounded-full bg-paper" />
              <span className="absolute -right-9 -top-[9px] h-[18px] w-[18px] rounded-full bg-paper" />
            </div>

            {successMessage ? (
              <p className="mb-3 rounded-lg border border-cu-yellow/30 bg-cu-yellow/10 px-3 py-2 text-xs font-semibold leading-relaxed text-cu-yellow">
                {successMessage}
              </p>
            ) : null}

            {error ? (
              <p className="mb-3 rounded-lg bg-cu-red/20 px-3 py-1.5 text-xs font-semibold text-[#ffb4ae]">
                {error}
              </p>
            ) : null}

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="login"
                  className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-white/50"
                >
                  Login
                </label>
                <input
                  id="login"
                  type="email"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cu-yellow focus:bg-white/10"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-white/50"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 pr-10 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cu-yellow focus:bg-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-white/50 transition hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-white/55 transition hover:text-cu-yellow"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex h-10 w-full items-center justify-center rounded-full bg-cu-red text-sm font-bold text-white shadow-red transition hover:-translate-y-0.5 hover:bg-cu-red-dark disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Enter workspace"
              )}
            </button>

            <div
              className="mt-4 h-5 opacity-70"
              style={{
                background:
                  "repeating-linear-gradient(90deg, #fff 0 2px, transparent 2px 5px, #fff 5px 6px, transparent 6px 10px)",
              }}
            />
          </form>
        </motion.div>
      </div>
    </div>
  );
}
