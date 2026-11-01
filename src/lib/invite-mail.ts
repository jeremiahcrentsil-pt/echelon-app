/**
 * Deliver an invite link via Resend when configured.
 * Falls back to logging + returning the URL for coach copy/paste.
 */
export type InviteDelivery = {
  mode: "email" | "logged";
  inviteUrl: string;
  message: string;
  providerError?: string;
};

export function appBaseUrl() {
  const raw =
    process.env.APP_BASE_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:43127";
  return raw.replace(/\/$/, "");
}

export function buildInviteUrl(token: string) {
  return `${appBaseUrl()}/invite/${token}`;
}

export function isInviteEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.INVITE_FROM_EMAIL);
}

function inviteEmailHtml(input: {
  toName: string;
  coachName: string;
  inviteUrl: string;
}) {
  const safeName = escapeHtml(input.toName);
  const safeCoach = escapeHtml(input.coachName);
  const safeUrl = escapeHtml(input.inviteUrl);
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#0b1214;color:#e8eef0;font-family:Figtree,Segoe UI,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1214;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#121a1d;border:1px solid #243033;border-radius:16px;padding:28px;">
            <tr><td>
              <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#7dccc0;">Echelon</p>
              <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#f4f7f8;">You're invited</h1>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#b7c4c8;">
                Hi ${safeName}, <strong style="color:#f4f7f8;">${safeCoach}</strong> invited you to join Echelon as their client.
              </p>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.55;color:#b7c4c8;">
                Set a password, then complete a short onboarding questionnaire so coaching can start sharp.
              </p>
              <p style="margin:0 0 22px;">
                <a href="${safeUrl}" style="display:inline-block;background:#5eead4;color:#06201c;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:999px;">
                  Accept invite
                </a>
              </p>
              <p style="margin:0;font-size:12px;line-height:1.5;color:#809197;word-break:break-all;">
                Or paste this link: ${safeUrl}
              </p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function inviteEmailText(input: {
  toName: string;
  coachName: string;
  inviteUrl: string;
}) {
  return [
    `Hi ${input.toName},`,
    "",
    `${input.coachName} invited you to join Echelon as their client.`,
    `Accept your invite: ${input.inviteUrl}`,
    "",
    "This link lets you set a password and complete a short onboarding form.",
  ].join("\n");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function deliverInviteLink(input: {
  toEmail: string;
  toName: string;
  inviteUrl: string;
  coachName: string;
}): Promise<InviteDelivery> {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITE_FROM_EMAIL;

  if (resendKey && from) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [input.toEmail],
          subject: `${input.coachName} invited you to Echelon`,
          text: inviteEmailText(input),
          html: inviteEmailHtml(input),
        }),
      });

      if (response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          id?: string;
        };
        console.info(
          `[echelon:invite] emailed ${input.toEmail}` +
            (body.id ? ` (resend id ${body.id})` : ""),
        );
        return {
          mode: "email",
          inviteUrl: input.inviteUrl,
          message: `Invite emailed to ${input.toEmail}.`,
        };
      }

      const errText = await response.text();
      console.warn("[echelon:invite] Resend failed; falling back to copy-link.", errText);
      return {
        mode: "logged",
        inviteUrl: input.inviteUrl,
        message:
          "Email provider returned an error — invite URL is shown below so you can still share it.",
        providerError: errText.slice(0, 300),
      };
    } catch (error) {
      console.warn("[echelon:invite] Resend error; falling back to copy-link.", error);
      return {
        mode: "logged",
        inviteUrl: input.inviteUrl,
        message:
          "Could not reach the email provider — invite URL is shown below so you can still share it.",
        providerError: error instanceof Error ? error.message : "unknown error",
      };
    }
  }

  console.info(
    `[echelon:invite] No email provider configured. Invite for ${input.toName} <${input.toEmail}>:\n  ${input.inviteUrl}`,
  );
  return {
    mode: "logged",
    inviteUrl: input.inviteUrl,
    message:
      "Email not configured (set RESEND_API_KEY + INVITE_FROM_EMAIL) — invite URL logged and shown below for copy/paste.",
  };
}
