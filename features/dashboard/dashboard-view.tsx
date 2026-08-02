"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { HeroSection } from "@/features/dashboard/hero-section";
import { PackageSection } from "@/features/dashboard/package-section";
import { SeminarSection } from "@/features/dashboard/seminar-section";
import { SubmissionsSection } from "@/features/dashboard/submissions-section";
import { PasswordModal } from "@/features/dashboard/password-modal";
import { partnerInitials, readFileAsDataUrl } from "@/lib/utils";
import type { EventPackageSummary, Partner } from "@/lib/types";

type DashboardPayload = {
  partner: Partner;
  packages: EventPackageSummary[];
  mustChangePassword: boolean;
  uploadStatus: ReturnType<
    typeof import("@/lib/partner-portal-docs").getPartnerPortalUploadStatus
  >;
};

async function fetchDashboard(): Promise<DashboardPayload> {
  const res = await fetch("/api/partner", { credentials: "same-origin" });
  if (res.status === 401) {
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "failed");
  }
  return res.json();
}

export function DashboardView() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["partner-dashboard"],
    queryFn: fetchDashboard,
    retry: false,
  });

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
    router.replace("/login");
    router.refresh();
  };

  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ["partner-dashboard"] });

  useEffect(() => {
    if (isPending || error?.message !== "unauthorized") return;
    let cancelled = false;
    (async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (cancelled) return;
      router.replace("/login");
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [isPending, error, router]);

  const patchMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/partner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }
    },
    onSuccess: () => {
      refresh();
    },
  });

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cu-red" />
      </div>
    );
  }

  if (isError || !data) {
    if (error?.message === "unauthorized") {
      return null;
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-5 text-center">
        <p className="cu-eyebrow">Something went wrong</p>
        <h1 className="font-display text-3xl font-bold">
          Couldn&apos;t load your workspace
        </h1>
        <p className="max-w-sm text-sm font-medium text-ink-soft">
          {error?.message && error.message !== "failed"
            ? error.message
            : "Something went wrong while loading your package. You can retry or sign out and try again."}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => void refetch()} className="cu-btn-primary">
            Retry
          </button>
          <button type="button" onClick={logout} className="cu-btn-ghost !py-3">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const { partner, packages, uploadStatus, mustChangePassword } = data;
  const logoDoc = partner.portalDocuments?.find((d) => d.kind === "logo");

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[60] bg-cu-red text-white">
        <div className="cu-wrap flex min-h-8 items-center justify-center gap-6 py-1.5 text-[12px] font-semibold">
          <a
            href="mailto:info@careeruttsav.in"
            className="opacity-95 transition hover:opacity-100"
          >
            info@careeruttsav.in
          </a>
          <span className="hidden text-white/40 sm:inline">·</span>
          <a
            href="https://www.careeruttsav.in"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden opacity-95 transition hover:opacity-100 sm:inline"
          >
            www.careeruttsav.in
          </a>
        </div>
      </div>

      <header className="sticky top-8 z-50 pt-4">
        <div className="cu-wrap">
          <div className="flex items-center justify-between gap-4 rounded-full border border-line bg-white/80 px-3 py-2.5 shadow-card backdrop-blur-xl sm:px-4">
            <div className="flex items-center gap-3 pl-1">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-ink font-display text-sm font-bold text-white">
                CU
              </div>
              <div className="hidden sm:block">
                <p className="font-display text-lg font-bold leading-none">
                  Career Uttsav
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  Partner portal
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full bg-paper-dim py-1 pl-1 pr-3 md:flex">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-cu-red text-[11px] font-extrabold text-white">
                  {partnerInitials(partner.name)}
                </span>
                <span className="max-w-[150px] truncate text-sm font-semibold">
                  {partner.name}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="h-10 rounded-full border-2 border-ink px-4 text-sm font-bold transition hover:bg-ink hover:text-paper"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="cu-wrap pb-20 pt-10 sm:pt-12">
        <HeroSection
          partner={partner}
          packages={packages}
          uploadStatus={uploadStatus}
          logoUrl={logoDoc?.url}
          onLogoUpload={async (file) => {
            const url = await readFileAsDataUrl(file);
            await patchMutation.mutateAsync({
              action: "upload_document",
              kind: "logo",
              label: "University logo",
              fileName: file.name,
              mimeType: file.type,
              url,
              fileSizeBytes: file.size,
            });
          }}
          saving={patchMutation.isPending}
        />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.5 }}
          className="mt-12 grid gap-6 lg:grid-cols-[1.25fr_0.9fr] lg:items-start"
        >
          <div className="min-w-0 space-y-6">
            <PackageSection packages={packages} />
            <SeminarSection packages={packages} />
          </div>

          <div className="min-w-0 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            <SubmissionsSection
              partner={partner}
              packages={packages}
              saving={patchMutation.isPending}
              onSaveText={async (field, value) => {
                await patchMutation.mutateAsync({
                  action: "text_field",
                  field,
                  value,
                });
              }}
              onUploadFile={async (kind, label, file) => {
                const url = await readFileAsDataUrl(file);
                await patchMutation.mutateAsync({
                  action: "upload_document",
                  kind,
                  label,
                  fileName: file.name,
                  mimeType: file.type,
                  url,
                  fileSizeBytes: file.size,
                });
              }}
              onSaveSpeakers={async (eventId, seminarId, speakers) => {
                await patchMutation.mutateAsync({
                  action: "seminar_speakers",
                  eventId,
                  seminarId,
                  speakers,
                });
              }}
            />
          </div>
        </motion.div>

        <footer className="mt-16 border-t border-line pt-8 text-center">
          <p className="font-display text-2xl font-bold tracking-tight">
            Your future doesn&apos;t wait.{" "}
            <em className="not-italic text-cu-red">Neither should your assets.</em>
          </p>
          <p className="mt-3 text-sm font-medium text-ink-soft">
            Need help?{" "}
            <a
              href="mailto:info@careeruttsav.in"
              className="font-bold text-cu-red hover:underline"
            >
              info@careeruttsav.in
            </a>
          </p>
        </footer>
      </main>

      <PasswordModal
        open={mustChangePassword}
        onSave={async (password) => {
          await patchMutation.mutateAsync({
            action: "change_password",
            password,
          });
          refresh();
        }}
      />
    </>
  );
}
