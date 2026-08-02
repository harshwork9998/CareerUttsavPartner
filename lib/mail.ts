function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3001"
  );
}

export function buildResetPasswordUrl(token: string) {
  return `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

function brandedResetHtml(resetUrl: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Partner Portal password</title>
</head>
<body style="margin:0;padding:0;background:#FBFAF3;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#14121A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#FBFAF3;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(20,18,26,0.12);border-radius:28px;overflow:hidden;">
          <tr>
            <td style="background:#14121A;padding:28px 32px;">
              <div style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#fff;">Career Uttsav</div>
              <div style="margin-top:6px;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.55);font-weight:700;">Partner Portal</div>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 28px;">
              <div style="font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#E5372B;">Password reset</div>
              <h1 style="margin:14px 0 0;font-size:32px;line-height:1.05;letter-spacing:-0.02em;font-family:Georgia,serif;">Reset your password</h1>
              <p style="margin:16px 0 0;font-size:15px;line-height:1.6;color:#3A3742;">
                We received a request to reset the password for your Career Uttsav Partner Portal account.
                This link expires in <strong>30 minutes</strong> and can only be used once.
              </p>
              <div style="margin:28px 0 8px;">
                <a href="${resetUrl}" style="display:inline-block;background:#E5372B;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px;box-shadow:0 10px 24px -8px rgba(229,55,43,0.55);">
                  Reset Password
                </a>
              </div>
              <p style="margin:24px 0 0;font-size:13px;line-height:1.55;color:#6B6775;">
                If the button doesn&apos;t work, copy and paste this link into your browser:<br />
                <a href="${resetUrl}" style="color:#1E3FE0;word-break:break-all;">${resetUrl}</a>
              </p>
              <p style="margin:22px 0 0;font-size:13px;line-height:1.55;color:#6B6775;">
                If you didn&apos;t request this, you can safely ignore this email. Your password will stay the same.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 28px;border-top:1px solid rgba(20,18,26,0.08);font-size:12px;color:#6B6775;">
              Need help? <a href="mailto:info@careeruttsav.in" style="color:#E5372B;font-weight:700;">info@careeruttsav.in</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  resetUrl: string;
}): Promise<{ ok: boolean; mocked?: boolean }> {
  const html = brandedResetHtml(opts.resetUrl);
  const subject = "Reset your Career Uttsav Partner Portal password";
  const from =
    process.env.MAIL_FROM ?? "Career Uttsav <onboarding@resend.dev>";
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.info(
      `[mail] Password reset email (dev/mock) → ${opts.to}\n${opts.resetUrl}`
    );
    return { ok: true, mocked: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("[mail] Resend failed", res.status, body);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error("[mail] Resend error", err);
    return { ok: false };
  }
}
