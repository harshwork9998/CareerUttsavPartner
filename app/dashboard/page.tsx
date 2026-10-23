import { redirect } from "next/navigation";
import { mergeAdminPartners } from "@/lib/partner-store";
import { getSession } from "@/lib/session";
import { DashboardView } from "@/features/dashboard/dashboard-view";

export default async function DashboardPage() {
  await mergeAdminPartners();
  const session = await getSession();
  if (!session) redirect("/login");
  return <DashboardView />;
}
