"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export function ForgotPasswordView() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setError("Too many requests. Please wait a few minutes and try again.");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setSubmitted(true);
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
            <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-cu-yellow">
              Account recovery
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-none tracking-tight">
              Forgot password?
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Enter the email registered for your Partner Portal account. We&apos;ll
              send reset instructions if it matches an active partner.
            </p>

            <div className="relative my-5 border-t-2 border-dashed border-white/20">
              <span className="absolute -left-9 -top-[9px] h-[18px] w-[18px] rounded-full bg-paper" />
              <span className="absolute -right-9 -top-[9px] h-[18px] w-[18px] rounded-full bg-paper" />
            </div>

            {submitted ? (
              <div className="rounded-xl border border-cu-yellow/30 bg-cu-yellow/10 px-4 py-3 text-sm leading-relaxed text-white/90">
                If an account exists for this email, password reset instructions
                have been sent.
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                {error ? (
                  <p className="rounded-lg bg-cu-red/20 px-3 py-1.5 text-xs font-semibold text-[#ffb4ae]">
                    {error}
                  </p>
                ) : null}
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-white/50"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@university.edu"
                    className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-cu-yellow focus:bg-white/10"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-10 w-full items-center justify-center rounded-full bg-cu-red text-sm font-bold text-white shadow-red transition hover:-translate-y-0.5 hover:bg-cu-red-dark disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Send reset link"
                  )}
                </button>
              </form>
            )}

            <Link
              href="/login"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-white/55 transition hover:text-cu-yellow"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to login
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
