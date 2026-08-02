import { redirect } from "next/navigation";
import { getPartnerById, getPartnerByLogin, mergeAdminPartners } from "@/lib/partner-store";
import { getSession } from "@/lib/session";
import { DashboardView } from "@/features/dashboard/dashboard-view";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  await mergeAdminPartners();
  const partner =
    getPartnerById(session.partnerId) ?? getPartnerByLogin(session.login);
  if (!partner) redirect("/api/auth/logout");

  return <DashboardView />;
}
