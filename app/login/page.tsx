import { redirect } from "next/navigation";
import { readSession } from "@/lib/session";
import { LoginView } from "@/features/login/login-view";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const params = await searchParams;
  const session = await readSession();
  if (session.status === "ok") redirect("/dashboard");
  return <LoginView resetSuccess={params.reset === "success"} />;
}
