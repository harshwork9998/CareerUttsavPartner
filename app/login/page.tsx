import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginView } from "@/features/login/login-view";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");
  return <LoginView />;
}
