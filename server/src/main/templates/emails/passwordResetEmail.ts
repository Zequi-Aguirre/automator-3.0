import { baseLayout } from './baseLayout';

export type PasswordResetEmailData = {
    name: string;
    email: string;
    tempPassword: string;
    appUrl?: string;
};

export function passwordResetEmail(data: PasswordResetEmailData): { subject: string; html: string } {
    const { name, email, tempPassword, appUrl } = data;
    const loginUrl = appUrl ?? 'https://app.automator.io';

    const content = `
      <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">Password Reset</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Hi ${name}, your password has been reset by an administrator. Use the temporary password below to log in.</p>

      <!-- Credentials box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:28px;">
        <tr>
          <td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;">
                  <span style="color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Email</span>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0 14px;border-bottom:1px solid #e5e7eb;">
                  <span style="color:#111827;font-size:15px;font-family:monospace;">${email}</span>
                </td>
              </tr>
              <tr>
                <td style="padding-top:14px;padding-bottom:4px;">
                  <span style="color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">New Temporary Password</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span style="color:#111827;font-size:18px;font-weight:700;font-family:monospace;letter-spacing:2px;">${tempPassword}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- Warning -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:1px solid #fcd34d;border-radius:6px;margin-bottom:28px;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0;color:#92400e;font-size:13px;line-height:1.5;">
              <strong>You will be required to set a new password</strong> the first time you log in with this temporary password.
            </p>
          </td>
        </tr>
      </table>

      <!-- CTA -->
      <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="background-color:#111827;border-radius:6px;">
            <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">
              Log in to Automator →
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
        If you did not request this reset, please contact your administrator immediately.
      </p>
    `;

    return {
        subject: 'Your Automator password has been reset',
        html: baseLayout(content),
    };
}
