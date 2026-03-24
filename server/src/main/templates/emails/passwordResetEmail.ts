import { baseLayout } from './baseLayout';

export type PasswordResetEmailData = {
    name: string;
    setPasswordUrl: string;
};

export function passwordResetEmail(data: PasswordResetEmailData): { subject: string; html: string } {
    const { name, setPasswordUrl } = data;

    const content = `
      <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Password Reset</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Hi ${name}, a password reset was requested for your account. Click the button below to set a new password.</p>

      <!-- CTA -->
      <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="background-color:#111827;border-radius:6px;">
            <a href="${setPasswordUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">
              Reset Password →
            </a>
          </td>
        </tr>
      </table>

      <!-- Expiry notice -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:1px solid #fcd34d;border-radius:6px;margin-bottom:28px;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
              This link expires in <strong>24 hours</strong>. If it expires, request another reset from the login page.
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
        If you did not request this reset, you can safely ignore this email — your password will not change.
      </p>
    `;

    return {
        subject: 'Reset your Automator password',
        html: baseLayout(content),
    };
}
