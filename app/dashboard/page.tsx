import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { DashboardView } from "@/features/dashboard/dashboard-view";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <DashboardView />;
}
