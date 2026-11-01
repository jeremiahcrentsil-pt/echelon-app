/**
 * Deliver an invite link. When SMTP/Resend isn't configured, log the URL
 * (and return it to the coach UI for copy/paste in local/dev).
 */
export type InviteDelivery = {
  mode: "logged" | "email";
  inviteUrl: string;
  message: string;
};

export function appBaseUrl() {
  return (
    process.env.APP_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:43127"
  ).replace(/\/$/, "");
}

export function buildInviteUrl(token: string) {
  return `${appBaseUrl()}/invite/${token}`;
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
          to: input.toEmail,
          subject: `${input.coachName} invited you to Echelon`,
          text: [
            `Hi ${input.toName},`,
            "",
            `${input.coachName} invited you to join Echelon as their client.`,
            `Accept your invite: ${input.inviteUrl}`,
            "",
            "This link lets you set a password and complete a short onboarding form.",
          ].join("\n"),
        }),
      });
      if (response.ok) {
        return {
          mode: "email",
          inviteUrl: input.inviteUrl,
          message: `Invite emailed to ${input.toEmail}.`,
        };
      }
      console.warn(
        "[echelon:invite] Resend failed; falling back to log.",
        await response.text(),
      );
    } catch (error) {
      console.warn("[echelon:invite] Resend error; falling back to log.", error);
    }
  }

  console.info(
    `[echelon:invite] No email provider configured. Invite for ${input.toName} <${input.toEmail}>:\n  ${input.inviteUrl}`,
  );
  return {
    mode: "logged",
    inviteUrl: input.inviteUrl,
    message:
      "Email not configured — invite URL logged on the server and shown below for local/dev.",
  };
}
