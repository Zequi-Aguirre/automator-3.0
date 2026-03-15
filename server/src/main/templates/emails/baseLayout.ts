/**
 * Base HTML email layout.
 * Wrap your content section with this to get a consistent header/footer.
 */
export function baseLayout(content: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Automator</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#111827;padding:28px 40px;border-radius:8px 8px 0 0;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">Automator</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                This email was sent by Automator. Do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
