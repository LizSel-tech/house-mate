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
  const user = env('MAIL_USERNAME');
  const pass = env('MAIL_PASSWORD');
  const encryption = (env('MAIL_ENCRYPTION') || '').toLowerCase();

  return nodemailer.createTransport({
    host,
    port,
    secure: encryption === 'ssl' || port === 465,
    auth: user && pass ? { user, pass } : undefined,
    tls: encryption === 'tls' || encryption === 'starttls' ? { rejectUnauthorized: false } : undefined,
  });
}

function fromHeader(): string {
  const address = env('MAIL_FROM_ADDRESS')!;
  const name = unwrapQuotes(env('MAIL_FROM_NAME')) || 'Fixora';
  return `${name} <${address}>`;
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
      ? 'Your Fixora signup payment has been approved. Use this one-time code to log in:'
      : 'Use this one-time code to log in to Fixora:';

  const text = `${greeting}

${lead}

${input.code}

This code expires in 5 minutes. If you did not request it, you can ignore this email.

— Fixora`;

  const html = `
    <p>${greeting}</p>
    <p>${lead}</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:4px;margin:24px 0;">${input.code}</p>
    <p>This code expires in 5 minutes. If you did not request it, you can ignore this email.</p>
    <p>— Fixora</p>
  `;

  await sendMail({
    to: input.to,
    subject:
      input.reason === 'payment_approved'
        ? 'Payment approved — your Fixora login code'
        : 'Your Fixora login code',
    text,
    html,
  });
}
