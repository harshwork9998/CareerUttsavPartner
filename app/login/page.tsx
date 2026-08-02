import { redirect } from "next/navigation";
import {
  getPartnerById,
  getPartnerByLogin,
  mergeAdminPartners,
} from "@/lib/partner-store";
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
    const partner =
      getPartnerById(session.partnerId) ?? getPartnerByLogin(session.login);
    if (partner) redirect("/dashboard");
    redirect("/api/auth/logout");
  }
  return <LoginView resetSuccess={params.reset === "success"} />;
}
