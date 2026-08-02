import { redirect } from "next/navigation";
import { getPartnerForSession, mergeAdminPartners } from "@/lib/partner-store";
import { getSession } from "@/lib/session";
import { DashboardView } from "@/features/dashboard/dashboard-view";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await mergeAdminPartners();
  const partner = getPartnerForSession(session);
  if (!partner) redirect("/api/auth/logout");

  return <DashboardView />;
}
