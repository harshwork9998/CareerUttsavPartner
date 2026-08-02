import { ResetPasswordView } from "@/features/auth/reset-password-view";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <ResetPasswordView token={params.token?.trim() ?? ""} />;
}
