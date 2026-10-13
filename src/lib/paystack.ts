import { createHmac, timingSafeEqual } from 'crypto';

const BASE_URL = 'https://api.paystack.co';

function secretKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  return key && key.startsWith('sk_') ? key : null;
}

/** Without a secret key the app keeps the mock escrow flow (local development). */
export function isPaystackConfigured(): boolean {
  return Boolean(secretKey());
}

export function paystackMode(): 'live' | 'test' | 'off' {
  const key = secretKey();
  if (!key) return 'off';
  return key.startsWith('sk_live_') ? 'live' : 'test';
}

export class PaystackError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'PaystackError';
  }
}

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const key = secretKey();
  if (!key) throw new PaystackError('Paystack is not configured. Set PAYSTACK_SECRET_KEY.');

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  });
  const json = (await res.json().catch(() => null)) as
    | { status: boolean; message?: string; data?: T }
    | null;
  if (!res.ok || !json?.status) {
    throw new PaystackError(json?.message || `Paystack request failed (${res.status}).`, res.status);
  }
  return json.data as T;
}

export const toPesewas = (ghs: number) => Math.round(ghs * 100);
export const fromPesewas = (pesewas: number) => pesewas / 100;

export type PaystackTransactionData = {
  id: number;
  status: 'success' | 'failed' | 'abandoned' | 'ongoing' | 'pending' | 'reversed' | string;
  reference: string;
  amount: number;
  currency: string;
  channel: string | null;
  gateway_response: string | null;
  paid_at: string | null;
};

export function initializeTransaction(input: {
  email: string;
  amountGhs: number;
  reference: string;
  metadata: Record<string, unknown>;
}) {
  return paystack<{ authorization_url: string; access_code: string; reference: string }>(
    '/transaction/initialize',
    {
      method: 'POST',
      body: JSON.stringify({
        email: input.email,
        amount: toPesewas(input.amountGhs),
        currency: 'GHS',
        reference: input.reference,
        channels: ['mobile_money', 'card'],
        metadata: input.metadata,
      }),
    },
  );
}

export type ChargeResponse = {
  reference: string;
  status: 'pay_offline' | 'send_otp' | 'pending' | 'success' | 'failed' | string;
  display_text?: string | null;
  message?: string | null;
  gateway_response?: string | null;
};

/** Sends a payment prompt straight to the customer's mobile money wallet (no Paystack popup). */
export function chargeMobileMoney(input: {
  email: string;
  amountGhs: number;
  reference: string;
  phone: string;
  provider: 'mtn' | 'vod' | 'atl';
  metadata: Record<string, unknown>;
}) {
  return paystack<ChargeResponse>('/charge', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      amount: toPesewas(input.amountGhs),
      currency: 'GHS',
      reference: input.reference,
      mobile_money: { phone: input.phone, provider: input.provider },
      metadata: input.metadata,
    }),
  });
}

/** Telecel (and occasionally other networks) asks the customer for a code before sending the prompt. */
export function submitChargeOtp(reference: string, otp: string) {
  return paystack<ChargeResponse>('/charge/submit_otp', {
    method: 'POST',
    body: JSON.stringify({ reference, otp }),
  });
}

export function verifyTransaction(reference: string) {
  return paystack<PaystackTransactionData>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
}

export type PaystackBank = { name: string; code: string; type: string; active: boolean };

/** Ghana banks (`ghipss`) or mobile money providers (`mobile_money`). */
export async function listBanks(type: 'ghipss' | 'mobile_money'): Promise<PaystackBank[]> {
  const banks = await paystack<PaystackBank[]>(
    `/bank?country=ghana&currency=GHS&type=${type}&perPage=100`,
  );
  return banks.filter((b) => b.active !== false);
}

export function createTransferRecipient(input: {
  type: 'mobile_money' | 'ghipss';
  name: string;
  accountNumber: string;
  bankCode: string;
  metadata?: Record<string, unknown>;
}) {
  return paystack<{ recipient_code: string; details?: { account_name?: string | null } }>(
    '/transferrecipient',
    {
      method: 'POST',
      body: JSON.stringify({
        type: input.type,
        name: input.name,
        account_number: input.accountNumber,
        bank_code: input.bankCode,
        currency: 'GHS',
        metadata: input.metadata,
      }),
    },
  );
}

export function initiateTransfer(input: {
  amountGhs: number;
  recipientCode: string;
  reference: string;
  reason: string;
}) {
  return paystack<{ transfer_code: string; status: string; reference: string }>('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      amount: toPesewas(input.amountGhs),
      currency: 'GHS',
      recipient: input.recipientCode,
      reference: input.reference,
      reason: input.reason,
    }),
  });
}

export async function getGhsBalance(): Promise<number | null> {
  const balances = await paystack<{ currency: string; balance: number }[]>('/balance');
  const ghs = balances.find((b) => b.currency === 'GHS');
  return ghs ? fromPesewas(ghs.balance) : null;
}

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret key. */
export function isValidWebhookSignature(rawBody: string, signature: string | null): boolean {
  const key = secretKey();
  if (!key || !signature) return false;
  const expected = createHmac('sha512', key).update(rawBody).digest('hex');
  const given = Buffer.from(signature, 'utf8');
  const wanted = Buffer.from(expected, 'utf8');
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}
