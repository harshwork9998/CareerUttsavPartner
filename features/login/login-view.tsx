"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { MULTI_EVENT_DEMO } from "@/lib/seed-data";

export function LoginView() {
  const router = useRouter();
  const [login, setLogin] = useState<string>(MULTI_EVENT_DEMO.login);
  const [password, setPassword] = useState<string>(MULTI_EVENT_DEMO.password);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="relative flex min-h-[42vh] flex-col justify-end overflow-hidden bg-brand-950 p-8 text-white lg:min-h-screen lg:p-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "linear-gradient(165deg, rgba(11,22,40,0.88) 0%, rgba(31,56,100,0.78) 55%, rgba(138,106,47,0.45) 100%)",
          }}
        />
        <div className="relative z-10 mb-auto flex items-center gap-3 pt-2">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brass-500 to-[#E0C988] font-display text-lg font-bold text-brand-950">
            CU
          </div>
          <div>
            <p className="font-display text-xl font-semibold leading-tight">
              Career Uttsav
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">
              K2 Group
            </p>
          </div>
        </div>
        <div className="relative z-10">
          <h1 className="max-w-[11ch] font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
            Your partnership, all in one place.
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/78">
            Review your package, manage seminar seats, and share brand assets
            for Career Uttsav.
          </p>
        </div>
      </aside>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <form
          onSubmit={submit}
          className="w-full max-w-[420px] animate-fade-rise rounded-4xl border border-line-subtle bg-paper-surface p-8 shadow-soft"
        >
          <h2 className="font-display text-3xl font-bold text-brand-700">
            Partner Login
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-secondary">
            Sign in with the credentials emailed by Team Career Uttsav.
          </p>

          {error ? (
            <p className="mt-4 text-sm font-semibold text-red-700">{error}</p>
          ) : null}

          <div className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="login"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-secondary"
              >
                Login
              </label>
              <input
                id="login"
                type="email"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                required
                className="h-12 w-full rounded-xl border border-line-strong bg-paper-page px-4 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-700/10"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-ink-secondary"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 w-full rounded-xl border border-line-strong bg-paper-page px-4 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-700/10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-brand-700 font-semibold text-white transition hover:bg-brand-800 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in"}
          </button>

          <div className="mt-5 rounded-2xl border border-brass-500/30 bg-brass-100/60 px-4 py-3 text-xs leading-relaxed text-ink-secondary">
            <strong className="text-brass-700">3-event layout demo:</strong>{" "}
            Christ University —{" "}
            <code className="text-[11px]">{MULTI_EVENT_DEMO.login}</code> /{" "}
            <code className="text-[11px]">{MULTI_EVENT_DEMO.password}</code>
            <span className="mt-1 block text-[11px] text-ink-muted">
              Bangalore · Mysore · Hubli — separate packages, tiers &amp; seminars
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
