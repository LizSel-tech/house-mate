import { createHmac, timingSafeEqual } from 'crypto';
import { readFile } from 'fs/promises';
import path from 'path';

export type SmileSubmitInput = {
  userId: string;
  jobId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  documentFrontPath: string; // absolute or public-relative
  documentBackPath?: string | null;
  selfiePath: string;
  livenessPaths: string[];
  callbackUrl: string;
};

export type SmileSubmitResult = {
  mode: 'live' | 'mock';
  jobId: string;
  userId: string;
  raw?: unknown;
};

function getBaseUrl() {
  const env = process.env.SMILE_ID_ENVIRONMENT || 'sandbox';
  return env === 'production'
    ? 'https://api.smileidentity.com'
    : 'https://testapi.smileidentity.com';
}

export function isSmileConfigured(): boolean {
  return Boolean(
    process.env.SMILE_ID_PARTNER_ID?.trim() &&
      process.env.SMILE_ID_API_KEY?.trim() &&
      process.env.SMILE_ID_CALLBACK_URL?.trim()
  );
}

/** Classic Smile HMAC used by many partner APIs */
export function createSmileSignature(timestamp: string): string {
  const partnerId = process.env.SMILE_ID_PARTNER_ID || '';
  const apiKey = process.env.SMILE_ID_API_KEY || '';
  const hmac = createHmac('sha256', apiKey);
  hmac.update(timestamp, 'utf8');
  hmac.update(partnerId, 'utf8');
  hmac.update('sid_request', 'utf8');
  return hmac.digest('base64');
}

export function verifySmileWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null
): boolean {
  const secret = process.env.SMILE_ID_WEBHOOK_SECRET || process.env.SMILE_ID_API_KEY;
  if (!secret) {
    // Allow in mock/dev when secret is not configured
    return process.env.NODE_ENV !== 'production';
  }
  if (!signatureHeader || !timestampHeader) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest('hex');

  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader.replace(/^sha256=/i, ''));
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function resolvePublicFile(publicUrl: string): Promise<Buffer> {
  const relative = publicUrl.startsWith('/') ? publicUrl.slice(1) : publicUrl;
  const full = path.join(process.cwd(), 'public', relative);
  return readFile(full);
}

async function getAccessToken(): Promise<string> {
  const partnerId = process.env.SMILE_ID_PARTNER_ID!;
  const timestamp = new Date().toISOString();
  const signature = createSmileSignature(timestamp);

  const res = await fetch(`${getBaseUrl()}/v3/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      partner_id: partnerId,
      timestamp,
      signature,
      // Bind product defaults when supported by account
      product: 'doc_verification',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Smile token error (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { token?: string; access_token?: string };
  const token = data.token || data.access_token;
  if (!token) throw new Error('Smile token response missing token.');
  return token;
}

/**
 * Submit Document Verification to Smile Identity v3.
 * Ghana Card: country=GH, id_type=NATIONAL_ID (auto-classify also allowed).
 * Requires 1 selfie + 6–8 liveness frames + document front (+ optional back).
 */
export async function submitDocumentVerification(
  input: SmileSubmitInput
): Promise<SmileSubmitResult> {
  if (!isSmileConfigured()) {
    return {
      mode: 'mock',
      jobId: `mock_${input.jobId}`,
      userId: input.userId,
    };
  }

  if (input.livenessPaths.length < 6) {
    throw new Error('At least 6 liveness images are required.');
  }

  const token = await getAccessToken();
  const form = new FormData();

  const selfie = await resolvePublicFile(input.selfiePath);
  form.append(
    'selfie_image',
    new Blob([new Uint8Array(selfie)], { type: 'image/jpeg' }),
    'selfie.jpg'
  );

  for (const [index, livePath] of input.livenessPaths.entries()) {
    const buf = await resolvePublicFile(livePath);
    form.append(
      'liveness_images',
      new Blob([new Uint8Array(buf)], { type: 'image/jpeg' }),
      `liveness_${index}.jpg`
    );
  }

  const docFront = await resolvePublicFile(input.documentFrontPath);
  form.append(
    'document',
    new Blob([new Uint8Array(docFront)], { type: 'image/jpeg' }),
    'document_front.jpg'
  );

  if (input.documentBackPath) {
    const docBack = await resolvePublicFile(input.documentBackPath);
    form.append(
      'document_back',
      new Blob([new Uint8Array(docBack)], { type: 'image/jpeg' }),
      'document_back.jpg'
    );
  }

  const consent = {
    granted: true,
    granted_at: new Date().toISOString(),
    notice_language: 'EN',
    notice_privacy_policy_url:
      process.env.SMILE_ID_PRIVACY_POLICY_URL ||
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/privacy`,
  };

  const phone = input.phone.startsWith('+') ? input.phone : `+233${input.phone.replace(/^0/, '')}`;

  form.append('consent', JSON.stringify(consent));
  form.append('country', 'GH');
  form.append('id_type', 'NATIONAL_ID');
  form.append(
    'user_details',
    JSON.stringify({
      given_names: input.firstName,
      last_name: input.lastName,
      phone_number: phone,
      ...(input.email ? { email: input.email } : {}),
    })
  );
  form.append('callback_url', input.callbackUrl);
  form.append(
    'partner_params',
    JSON.stringify({
      job_id: input.jobId,
      user_id: input.userId,
      source: 'handyman',
    })
  );

  const res = await fetch(`${getBaseUrl()}/v3/document_verification`, {
    method: 'POST',
    headers: {
      'SmileID-Token': token,
      'SmileID-Partner-ID': process.env.SMILE_ID_PARTNER_ID!,
      'User-ID': input.userId,
      'SmileID-Source-SDK': 'rest_api',
      'SmileID-Source-SDK-Version': '1.0.0',
    },
    body: form,
  });

  const raw = await res.json().catch(async () => ({ message: await res.text() }));
  if (!res.ok) {
    throw new Error(
      `Smile document verification failed (${res.status}): ${JSON.stringify(raw)}`
    );
  }

  const data = raw as { job_id?: string; user_id?: string };
  return {
    mode: 'live',
    jobId: data.job_id || input.jobId,
    userId: data.user_id || input.userId,
    raw,
  };
}

export function mapSmileStatusToKyc(status?: string): 'verified' | 'rejected' | 'error' | 'pending' {
  switch ((status || '').toLowerCase()) {
    case 'clear':
      return 'verified';
    case 'attention':
    case 'block':
      return 'rejected';
    case 'error':
      return 'error';
    case 'accepted':
    case 'processing':
      return 'pending';
    default:
      return 'pending';
  }
}
