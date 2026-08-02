import { redirect } from "next/navigation";
import { getPartnerById, getPartnerByLogin, mergeAdminPartners } from "@/lib/partner-store";
import { getSession } from "@/lib/session";
import { LoginView } from "@/features/login/login-view";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    await mergeAdminPartners();
    const partner =
      getPartnerById(session.partnerId) ?? getPartnerByLogin(session.login);
    if (partner) redirect("/dashboard");
    // Stale cookie with no matching partner — clear it instead of looping.
    redirect("/api/auth/logout");
  }
  return <LoginView />;
}
