import { redirect } from "next/navigation";
import { getPartnerForSession, mergeAdminPartners } from "@/lib/partner-store";
import { getSession } from "@/lib/session";
import { LoginView } from "@/features/login/login-view";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (session) {
    await mergeAdminPartners();
    const partner = getPartnerForSession(session);
    if (partner) redirect("/dashboard");
    redirect("/api/auth/logout");
  }
  return <LoginView resetSuccess={params.reset === "success"} />;
}
