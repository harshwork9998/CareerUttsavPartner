import { redirect } from "next/navigation";
import { mergeAdminPartners } from "@/lib/partner-store";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  await mergeAdminPartners();
  const session = await getSession();
  redirect(session ? "/dashboard" : "/login");
}
