import { redirect } from "next/navigation";
import { getPartnerForSession, mergeAdminPartners } from "@/lib/partner-store";
import { getSession } from "@/lib/session";
import { DashboardView } from "@/features/dashboard/dashboard-view";

export default async function DashboardPage() {
  // Refresh Admin-backed partners before validating the session cookie
  // against the in-memory store (avoids false logouts on cold workers).
  await mergeAdminPartners();
  const session = await getSession();
  if (!session) redirect("/login");

  const partner = getPartnerForSession(session);
  if (!partner) redirect("/api/auth/logout");

  return <DashboardView />;
}
