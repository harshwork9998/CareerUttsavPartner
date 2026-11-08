import { redirect } from "next/navigation";
import { mergeAdminPartners } from "@/lib/partner-store";
import { readSession } from "@/lib/session";

export default async function HomePage() {
  await mergeAdminPartners();
  const session = await readSession();
  if (session.status === "unavailable") {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold">
          Partner portal is temporarily unavailable. Please refresh.
        </p>
      </main>
    );
  }
  redirect(session.status === "ok" ? "/dashboard" : "/login");
}
