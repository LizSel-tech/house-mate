import nodemailer from 'nodemailer';

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value || value.toLowerCase() === 'null') return undefined;
  return value;
}

function unwrapQuotes(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function isMailConfigured(): boolean {
  return Boolean(env('MAIL_HOST') && env('MAIL_FROM_ADDRESS'));
}

function createTransport() {
  const host = env('MAIL_HOST');
  const from = env('MAIL_FROM_ADDRESS');
  if (!host || !from) {
    throw new Error('Mail is not configured. Set MAIL_HOST and MAIL_FROM_ADDRESS.');
  }

  const port = Number(env('MAIL_PORT') || 587);
  const user = env('MAIL_USERNAME') || from;
  const pass = env('MAIL_PASSWORD');
  const encryption = (env('MAIL_ENCRYPTION') || '').toLowerCase();
  const implicitTls = encryption === 'ssl' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure: implicitTls,
    auth: user && pass ? { user, pass } : undefined,
    tls: { rejectUnauthorized: false },
  });
}

function fromHeader(): string {
  const address = env('MAIL_FROM_ADDRESS')!;
  const name = unwrapQuotes(env('MAIL_FROM_NAME')) || 'Fixora';
  return `${name} <${address}>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // MailHog's Angular preview treats {{ }} as bindings; break them up.
    .replace(/\{\{/g, '{&#8203;{')
    .replace(/\}\}/g, '}&#8203;}');
}

function renderEmailLayout(input: {
  preheader: string;
  bodyHtml: string;
}): string {
  const year = new Date().getFullYear();
  // Single-root fragment only. A full <html> document (or multiple roots)
  // makes MailHog's Angular HTML tab render as "{{preview.previewHTML}}".
  return `
<div ng-non-bindable data-ng-non-bindable style="margin:0;padding:0;background:#FAFAF9;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;padding:32px 16px;background:#FAFAF9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1C1917;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E7E5E4;border-radius:16px;">
          <tr>
            <td style="background:#292524;padding:24px 32px;border-bottom:3px solid #D97706;">
              <p style="margin:0;font-size:20px;font-weight:800;letter-spacing:-0.03em;color:#FFFFFF;">Fixora</p>
              <p style="margin:6px 0 0;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#D97706;">Trusted home services</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">${input.bodyHtml}</td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #E7E5E4;">
              <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#78716C;">Verified artisans across Ghana. Pay with escrow until the job is done.</p>
              <p style="margin:0;font-size:12px;color:#A8A29E;">&copy; ${year} Fixora · This is an automated message.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</div>`;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  if (!isMailConfigured()) {
    throw new Error('Mail is not configured. Set MAIL_HOST and MAIL_FROM_ADDRESS.');
  }

  const transport = createTransport();
  await transport.sendMail({
    from: fromHeader(),
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
}

export async function sendOtpEmail(input: {
  to: string;
  name?: string | null;
  code: string;
  reason: 'payment_approved' | 'login';
}) {
  const greeting = input.name?.trim() ? `Hi ${input.name.trim()},` : 'Hi,';
  const lead =
    input.reason === 'payment_approved'
      ? 'Your signup payment is confirmed. Use this code to sign in and finish setting up.'
      : 'Use this one-time code to sign in to Fixora.';
  const subject =
    input.reason === 'payment_approved'
      ? 'Payment approved - your Fixora login code'
      : 'Your Fixora login code';
  const preheader = 'Your 6-digit Fixora login code expires in 5 minutes.';

  const text = `${greeting}

${lead}

${input.code}

This code expires in 5 minutes. If you did not request it, you can ignore this email.

Verified artisans across Ghana. Pay with escrow until the job is done.

- Fixora`;

  const html = renderEmailLayout({
    preheader,
    bodyHtml: `
      <p style="margin:0 0 8px;font-size:16px;color:#1C1917;">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#78716C;">${escapeHtml(lead)}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="background:#FAFAF9;border:1px solid #E7E5E4;border-radius:12px;padding:20px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#78716C;">Login code</p>
            <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:0.28em;color:#1C1917;font-variant-numeric:tabular-nums;">${escapeHtml(input.code)}</p>
          </td>
        </tr>
      </table>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#78716C;">This code expires in <strong style="color:#1C1917;">5 minutes</strong>. If you did not request it, you can ignore this email.</p>
    `,
  });

  await sendMail({
    to: input.to,
    subject,
    text,
    html,
  });
}
