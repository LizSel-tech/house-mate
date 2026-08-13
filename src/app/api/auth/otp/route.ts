import { NextResponse } from 'next/server';
import { issueOtpToUser } from '@/lib/auth/otp';
import { normalizePhone } from '@/lib/auth/session-token';
import { isDatabaseConfigured, queryOne } from '@/lib/db';
import type { User } from '@/types/db';

/**
 * Request a login OTP.
 * Only active accounts (payment already approved) can receive a code.
 * OTP is emailed — never returned in the API response unless OTP_DEV_MODE=true.
 */
export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: 'Database is not configured.' }, { status: 503 });
    }

    const body = (await request.json()) as {
      phone?: string;
      purpose?: 'login' | 'signup';
      demoAdmin?: boolean;
    };
    const phoneRaw = body.phone?.trim();
    if (!phoneRaw) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    const purpose = body.purpose === 'signup' ? 'signup' : 'login';
    if (purpose !== 'login') {
      return NextResponse.json(
        { error: 'OTP is only sent after your signup payment is approved. Please wait for confirmation, then log in.' },
        { status: 400 },
      );
    }

    const phone = normalizePhone(phoneRaw) || phoneRaw;
    let user = await queryOne<User>(
      `SELECT * FROM users WHERE phone = $1 OR phone = $2 LIMIT 1`,
      [phone, phoneRaw],
    );

    // Demo admin bootstrap: allow OTP before the account exists.
    if (!user && body.demoAdmin) {
      const adminEmail =
        process.env.DEMO_ADMIN_EMAIL?.trim() ||
        process.env.MAIL_FROM_ADDRESS?.trim() ||
        'admin@localhost';
      user = await queryOne<User>(
        `INSERT INTO users (name, phone, email, role, account_status)
         VALUES ('Platform Admin', $1, $2, 'admin', 'active')
         RETURNING *`,
        [phone, adminEmail.replace(/^null$/i, 'admin@localhost')],
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'No account found for this phone. Please sign up first.' },
        { status: 404 },
      );
    }

    if (user.accountStatus === 'pending_payment') {
      return NextResponse.json(
        {
          error:
            'Your signup payment is still awaiting admin confirmation. You’ll receive an email with your OTP after it’s approved.',
        },
        { status: 403 },
      );
    }

    if (user.accountStatus === 'suspended') {
      return NextResponse.json({ error: 'This account is suspended.' }, { status: 403 });
    }

    if (!user.email?.trim()) {
      return NextResponse.json(
        {
          error:
            'This account has no email address, so we can’t send an OTP. Contact support or sign up again with an email.',
        },
        { status: 400 },
      );
    }

    const result = await issueOtpToUser({
      user,
      purpose: 'login',
      reason: 'login',
    });

    return NextResponse.json({
      phone: result.phone,
      email: result.email,
      expiresAt: result.expiresAt,
      message: result.message,
      ...(result.devCode ? { devCode: result.devCode } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to send OTP.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
