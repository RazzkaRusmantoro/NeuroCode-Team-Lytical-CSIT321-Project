import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'NeuroCode <invites@neurocode.lol>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://neurocode.lol';
export async function sendOrgInviteEmail(email: string, orgName: string, inviterName: string, token: string): Promise<void> {
    const inviteUrl = `${APP_URL}/invite?token=${token}`;
    await resend.emails.send({
        from: FROM,
        to: email,
        subject: `You've been invited to join ${orgName} on NeuroCode`,
        html: buildInviteHtml({ email, orgName, inviterName, inviteUrl }),
    });
}
function buildInviteHtml({ orgName, inviterName, inviteUrl, }: {
    email: string;
    orgName: string;
    inviterName: string;
    inviteUrl: string;
}): string {
    const joinUrl = inviteUrl;
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>You've been invited to ${orgName}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:48px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;">

        <!-- Wordmark -->
        <tr><td align="center" style="padding-bottom:28px;">
          <span style="font-size:20px;font-weight:700;color:#d56707;letter-spacing:-0.4px;">NeuroCode</span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">

          <!-- Accent bar -->
          <tr><td style="background:#d56707;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>

          <!-- Body -->
          <tr><td style="padding:40px 44px 36px;">
            <h1 style="margin:0 0 12px;color:#09090b;font-size:20px;font-weight:700;letter-spacing:-0.3px;line-height:1.3;">
              You've been invited to join <span style="color:#d56707;">${orgName}</span>
            </h1>
            <p style="margin:0 0 8px;color:#52525b;font-size:14px;line-height:1.6;">
              <strong style="color:#18181b;">${inviterName}</strong> has invited you to collaborate on <strong style="color:#18181b;">${orgName}</strong> on NeuroCode.
            </p>
            <p style="margin:0 0 32px;color:#71717a;font-size:14px;line-height:1.6;">
              NeuroCode gives your team AI-powered codebase intelligence — knowledge graphs, auto-generated documentation, onboarding paths, and more.
            </p>
            <a href="${joinUrl}" style="display:inline-block;padding:11px 26px;background:#d56707;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
              Accept Invitation →
            </a>
          </td></tr>

          <!-- Divider -->
          <tr><td style="padding:0 44px;"><div style="border-top:1px solid #f4f4f5;"></div></td></tr>

          <!-- Footer inside card -->
          <tr><td style="padding:24px 44px 32px;">
            <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6;">
              If you weren't expecting this invitation you can safely ignore this email. This invite was sent by ${inviterName}.
            </p>
          </td></tr>

        </td></tr>

        <!-- Bottom footer -->
        <tr><td align="center" style="padding-top:24px;">
          <p style="margin:0;color:#a1a1aa;font-size:12px;">
            © ${new Date().getFullYear()} NeuroCode · <a href="${APP_URL}" style="color:#a1a1aa;text-decoration:underline;">neurocode.lol</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
