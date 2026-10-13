import { NextResponse } from 'next/server';
import { isDemoAdminEnabled } from '@/lib/auth/constants';
import { issueOtpToUser } from '@/lib/auth/otp';
import { normalizePhone } from '@/lib/auth/session-token';
import { isDatabaseConfigured, queryOne } from '@/lib/db';
import { logger } from '@/lib/logger';
import { MailDeliveryError } from '@/lib/mail';
import type { SignupPayment, User } from '@/types/db';

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
    if (!user && body.demoAdmin && isDemoAdminEnabled()) {
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
      const latest = await queryOne<SignupPayment>(
        `SELECT * FROM signup_payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [user.id],
      );
      const error =
        latest?.status === 'pending'
          ? 'Your signup payment is still awaiting admin confirmation. You’ll receive an email with your OTP after it’s approved.'
          : latest?.status === 'rejected'
            ? `${latest.rejectionReason || 'Your signup payment was rejected.'} Resubmit from the signup page using the same phone and email.`
            : 'Your signup fee has not been paid yet. Finish paying on the signup page using the same phone and email.';
      return NextResponse.json({ error, resubmit: latest?.status !== 'pending' }, { status: 403 });
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
    if (err instanceof MailDeliveryError) {
      return NextResponse.json({ error: 'We couldn’t send your code right now. Please try again in a few minutes.' }, { status: 503 });
    }
    await logger.error('auth.otp', 'OTP request failed', err);
    return NextResponse.json({ error: 'Unable to send your code. Please try again.' }, { status: 500 });
  }
}
