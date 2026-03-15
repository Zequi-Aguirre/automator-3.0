import { baseLayout } from './baseLayout';

export type AccountRequestEmailData = {
    requesterName: string;
    requesterEmail: string;
    priorDenials?: number;
    appUrl?: string;
};

export function accountRequestEmail(data: AccountRequestEmailData): { subject: string; html: string } {
    const { requesterName, requesterEmail, priorDenials, appUrl } = data;
    const usersUrl = `${appUrl ?? 'https://app.automator.io'}/users`;

    const priorNote = priorDenials && priorDenials > 0
        ? `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border:1px solid #fca5a5;border-radius:6px;margin-bottom:20px;">
             <tr><td style="padding:12px 18px;">
               <p style="margin:0;color:#991b1b;font-size:13px;">
                 <strong>Note:</strong> This email has been denied ${priorDenials} previous time${priorDenials > 1 ? 's' : ''}.
               </p>
             </td></tr>
           </table>`
        : '';

    const content = `
      <h2 style="margin:0 0 8px;color:#111827;font-size:22px;font-weight:700;">New Account Request</h2>
      <p style="margin:0 0 20px;color:#6b7280;font-size:14px;">Someone has requested access to Automator. Review and approve their account from the Users page.</p>
      ${priorNote}

      <!-- Requester info box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:28px;">
        <tr>
          <td style="padding:20px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;">
                  <span style="color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Name</span>
                </td>
              </tr>
              <tr>
                <td style="padding:6px 0 14px;border-bottom:1px solid #e5e7eb;">
                  <span style="color:#111827;font-size:15px;">${requesterName}</span>
                </td>
              </tr>
              <tr>
                <td style="padding-top:14px;padding-bottom:4px;">
                  <span style="color:#9ca3af;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Email</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span style="color:#111827;font-size:15px;font-family:monospace;">${requesterEmail}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>

      <!-- CTA -->
      <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="background-color:#111827;border-radius:6px;">
            <a href="${usersUrl}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">
              Review in Users →
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;color:#9ca3af;font-size:13px;line-height:1.6;">
        If you did not expect this request, you can safely ignore this email.
      </p>
    `;

    return {
        subject: `Account request from ${requesterName}`,
        html: baseLayout(content),
    };
}
