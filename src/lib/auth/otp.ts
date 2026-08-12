import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { query, queryOne } from '@/lib/db';
import { normalizePhone } from '@/lib/auth/session-token';
import type { OtpCode } from '@/types/db';

type OtpPurpose = 'login' | 'signup';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

export function generateOtpCode(): string {
  return String(randomInt(100000, 999999));
}

function safeEqualHash(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function issueOtp(phoneRaw: string, purpose: OtpPurpose = 'login') {
  const phone = normalizePhone(phoneRaw) || phoneRaw.trim();
  if (!phone) {
    throw new Error('Phone number is required.');
  }

  const code = generateOtpCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await query(
    `UPDATE otp_codes
     SET consumed_at = now()
     WHERE phone = $1 AND purpose = $2 AND consumed_at IS NULL`,
    [phone, purpose],
  );

  await query(
    `INSERT INTO otp_codes (phone, code_hash, purpose, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [phone, codeHash, purpose, expiresAt],
  );

  const exposeCode = process.env.NODE_ENV !== 'production' || process.env.OTP_DEV_MODE === 'true';

  return {
    phone,
    expiresAt,
    ...(exposeCode ? { devCode: code } : {}),
    message: exposeCode
      ? `Dev OTP: ${code} (valid 5 minutes)`
      : 'OTP sent to your phone.',
  };
}

export async function verifyOtp(
  phoneRaw: string,
  code: string,
  purpose: OtpPurpose = 'login',
): Promise<{ ok: true; phone: string } | { ok: false; error: string }> {
  const phone = normalizePhone(phoneRaw) || phoneRaw.trim();
  const codeHash = hashOtp(code.trim());

  const record = await queryOne<OtpCode>(
    `SELECT * FROM otp_codes
     WHERE phone = $1 AND purpose = $2 AND consumed_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone, purpose],
  );

  if (!record) {
    return { ok: false, error: 'No active OTP. Please request a new code.' };
  }

  const expiresAt = new Date(record.expiresAt);
  if (expiresAt.getTime() < Date.now()) {
    await query(`UPDATE otp_codes SET consumed_at = now() WHERE id = $1`, [record.id]);
    return { ok: false, error: 'OTP expired. Please request a new code.' };
  }

  if (record.attemptCount >= MAX_ATTEMPTS) {
    await query(`UPDATE otp_codes SET consumed_at = now() WHERE id = $1`, [record.id]);
    return { ok: false, error: 'Too many attempts. Please request a new code.' };
  }

  if (!safeEqualHash(record.codeHash, codeHash)) {
    await query(
      `UPDATE otp_codes SET attempt_count = attempt_count + 1 WHERE id = $1`,
      [record.id],
    );
    return { ok: false, error: 'Invalid OTP.' };
  }

  await query(`UPDATE otp_codes SET consumed_at = now() WHERE id = $1`, [record.id]);

  return { ok: true, phone };
}
