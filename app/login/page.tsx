import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginView } from "@/features/login/login-view";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <LoginView resetSuccess={params.reset === "success"} />;
}
