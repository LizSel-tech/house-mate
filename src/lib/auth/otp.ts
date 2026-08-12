import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { prisma } from '@/lib/db';
import { normalizePhone } from '@/lib/auth/session-token';

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

  await prisma.otpCode.updateMany({
    where: { phone, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.otpCode.create({
    data: { phone, codeHash, purpose, expiresAt },
  });

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
  purpose: OtpPurpose = 'login'
): Promise<{ ok: true; phone: string } | { ok: false; error: string }> {
  const phone = normalizePhone(phoneRaw) || phoneRaw.trim();
  const codeHash = hashOtp(code.trim());

  const record = await prisma.otpCode.findFirst({
    where: { phone, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    return { ok: false, error: 'No active OTP. Please request a new code.' };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return { ok: false, error: 'OTP expired. Please request a new code.' };
  }

  if (record.attemptCount >= MAX_ATTEMPTS) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return { ok: false, error: 'Too many attempts. Please request a new code.' };
  }

  if (!safeEqualHash(record.codeHash, codeHash)) {
    await prisma.otpCode.update({
      where: { id: record.id },
      data: { attemptCount: { increment: 1 } },
    });
    return { ok: false, error: 'Invalid OTP.' };
  }

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  return { ok: true, phone };
}
