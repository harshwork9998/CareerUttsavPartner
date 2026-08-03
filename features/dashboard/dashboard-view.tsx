"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

import { HeroSection } from "@/features/dashboard/hero-section";
import { PackageSection } from "@/features/dashboard/package-section";
import { SeminarSection } from "@/features/dashboard/seminar-section";
import { RepresentativesSection } from "@/features/dashboard/representatives-section";
import { SubmissionsSection } from "@/features/dashboard/submissions-section";
import { PasswordModal } from "@/features/dashboard/password-modal";
import { readFileAsDataUrl } from "@/lib/utils";
import type { EventPackageSummary, Partner } from "@/lib/types";

type DashboardPayload = {
  partner: Partner;
  packages: EventPackageSummary[];
  mustChangePassword: boolean;
  forcePasswordPrompt: boolean;
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
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordAllowLater, setPasswordAllowLater] = useState(false);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["partner-dashboard"],
    queryFn: fetchDashboard,
    retry: false,
  });

  useEffect(() => {
    if (data?.forcePasswordPrompt) {
      setPasswordOpen(true);
      setPasswordAllowLater(true);
    }
  }, [data?.forcePasswordPrompt]);

  const openChangePassword = () => {
    setPasswordAllowLater(false);
    setPasswordOpen(true);
  };

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

  const { partner, packages, uploadStatus } = data;
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

      <header className="cu-nav sticky top-8 z-50 pt-4">
        <div className="cu-wrap relative z-10 grid grid-cols-[auto_1fr] items-center gap-4 sm:gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/career-uttsav-logo.png"
            alt="Career Uttsav"
            className="h-14 w-auto sm:h-16 lg:h-[68px]"
          />

          <div className="cu-nav-pill flex min-w-0 items-center justify-between gap-2 px-2.5 py-2 sm:gap-4 sm:px-4 sm:py-2.5 sm:pl-5">
            <p className="min-w-0 truncate pl-1 text-sm font-semibold text-ink sm:pl-0 sm:text-base">
              {partner.name}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={openChangePassword}
                className="h-10 rounded-full border border-line bg-white px-3 text-xs font-bold text-ink-soft transition hover:border-ink hover:text-ink sm:px-4 sm:text-sm"
              >
                Change password
              </button>
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

      <main className="cu-wrap pb-20 pt-14 sm:pt-16">
        <HeroSection
          partner={partner}
          packages={packages}
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
          onLogoRemove={async () => {
            await patchMutation.mutateAsync({
              action: "remove_document",
              kind: "logo",
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
            <RepresentativesSection
              partner={partner}
              saving={patchMutation.isPending}
              onSave={async (payload) => {
                await patchMutation.mutateAsync({
                  action: "representatives",
                  count: payload.count,
                  representatives: payload.representatives,
                });
              }}
            />
          </div>

          <div className="min-w-0 lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
            <SubmissionsSection
              partner={partner}
              packages={packages}
              uploadStatus={uploadStatus}
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
            Questions about your submissions?{" "}
            <em className="not-italic text-cu-red">We&apos;re here to help.</em>
          </p>
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-medium text-ink-soft">
            <a
              href="mailto:info@careeruttsav.in"
              className="inline-flex items-center gap-1.5 font-bold text-cu-red hover:underline"
            >
              <Mail className="h-4 w-4" strokeWidth={2.25} />
              info@careeruttsav.in
            </a>
            <a
              href="tel:+919113064877"
              className="inline-flex items-center gap-1.5 font-bold text-cu-red hover:underline"
            >
              <Phone className="h-4 w-4" strokeWidth={2.25} />
              9113064877
            </a>
          </p>
        </footer>
      </main>

      <PasswordModal
        open={passwordOpen}
        allowLater={passwordAllowLater}
        onClose={
          passwordAllowLater
            ? undefined
            : () => {
                setPasswordOpen(false);
              }
        }
        onLater={async () => {
          await patchMutation.mutateAsync({
            action: "skip_password_prompt",
          });
          setPasswordOpen(false);
          setPasswordAllowLater(false);
          refresh();
        }}
        onSave={async (password) => {
          await patchMutation.mutateAsync({
            action: "change_password",
            password,
          });
          setPasswordOpen(false);
          setPasswordAllowLater(false);
          refresh();
        }}
      />
    </>
  );
}
