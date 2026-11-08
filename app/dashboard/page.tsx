import { redirect } from "next/navigation";
import { mergeAdminPartners } from "@/lib/partner-store";
import { readSession } from "@/lib/session";
import { DashboardView } from "@/features/dashboard/dashboard-view";

export default async function DashboardPage() {
  await mergeAdminPartners();
  const session = await readSession();
  if (session.status === "unavailable") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold">
          Partner portal is temporarily unavailable. Please refresh.
        </p>
      </main>
    );
  }
  if (session.status !== "ok") redirect("/login");
  return <DashboardView />;
}
