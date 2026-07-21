"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { HeroSection } from "@/features/dashboard/hero-section";
import { PackageSection } from "@/features/dashboard/package-section";
import { SeminarSection } from "@/features/dashboard/seminar-section";
import { SubmissionsSection } from "@/features/dashboard/submissions-section";
import { PasswordModal } from "@/features/dashboard/password-modal";
import { partnerInitials } from "@/lib/utils";
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
  const res = await fetch("/api/partner");
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error("failed");
  return res.json();
}

export function DashboardView() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["partner-dashboard"],
    queryFn: fetchDashboard,
    retry: false,
  });

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ["partner-dashboard"] });

  const patchMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/partner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-700" />
      </div>
    );
  }

  if (isError || !data) {
    router.replace("/login");
    return null;
  }

  const { partner, packages, uploadStatus, mustChangePassword } = data;
  const logoDoc = partner.portalDocuments?.find((d) => d.kind === "logo");

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line-subtle bg-paper-page/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brass-500 to-[#E0C988] font-display text-sm font-bold text-brand-950">
              CU
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-brand-700">
                Career Uttsav
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Partner portal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-line-subtle bg-white py-1 pl-1 pr-3 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-700 to-brand-500 text-xs font-bold text-white">
                {partnerInitials(partner.name)}
              </span>
              <span className="max-w-[140px] truncate text-sm font-semibold">
                {partner.name}
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="h-10 rounded-full border border-line-subtle px-4 text-sm font-semibold text-ink-secondary transition hover:bg-paper-muted"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16 pt-7">
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
            toast.success("Logo updated — looking great!");
          }}
          saving={patchMutation.isPending}
        />

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="space-y-5">
            <PackageSection packages={packages} />
            <SeminarSection packages={packages} />
          </div>

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
              toast.success("Saved");
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
              toast.success(`${label} received`);
            }}
            onSaveSpeakers={async (eventId, seminarId, speakers) => {
              await patchMutation.mutateAsync({
                action: "seminar_speakers",
                eventId,
                seminarId,
                speakers,
              });
              toast.success("Speaker details saved");
            }}
          />
        </div>

        <p className="mt-10 text-center text-xs text-ink-muted">
          Need help?{" "}
          <a
            href="mailto:info@careeruttsav.in"
            className="font-semibold text-brand-700"
          >
            info@careeruttsav.in
          </a>
          {" · "}
          <a
            href="https://www.careeruttsav.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand-700"
          >
            www.careeruttsav.in
          </a>
        </p>
      </main>

      <PasswordModal
        open={mustChangePassword}
        onSave={async (password) => {
          await patchMutation.mutateAsync({
            action: "change_password",
            password,
          });
          toast.success("Password updated");
          refresh();
        }}
      />
    </>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
