import { NextResponse } from 'next/server';
import { issueOtp } from '@/lib/auth/otp';
import { isDatabaseConfigured } from '@/lib/db';

export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: 'DATABASE_URL is not set.' }, { status: 503 });
    }

    const body = (await request.json()) as { phone?: string; purpose?: 'login' | 'signup' };
    const phone = body.phone?.trim();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    const purpose = body.purpose === 'signup' ? 'signup' : 'login';
    const result = await issueOtp(phone, purpose);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to send OTP.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
