import { NextResponse } from 'next/server';
import type { LoginPayload } from '@/types/auth';
import { PORTAL_HOME } from '@/lib/auth/constants';
import { verifyOtp } from '@/lib/auth/otp';
import { setSession } from '@/lib/auth/session';
import { toSessionUser } from '@/lib/auth/users';
import { isDatabaseConfigured, queryOne } from '@/lib/db';
import type { SignupPayment, User } from '@/types/db';

/**
 * Universal login — phone + OTP for all roles.
 * Blocks pending_payment accounts until admin confirms signup payment.
 */
export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            'Database is not configured. Set DATABASE_HOST, DATABASE_USER, and DATABASE_NAME in .env and restart the server.',
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as LoginPayload & { demoAdmin?: boolean };
    const phoneRaw = body.phone?.trim();
    const otp = body.otp?.trim();

    if (!phoneRaw || !otp) {
      return NextResponse.json({ error: 'Phone and OTP are required.' }, { status: 400 });
    }

    const verified = await verifyOtp(phoneRaw, otp, 'login');
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 401 });
    }

    const phone = verified.phone;

    let user = await queryOne<User>(`SELECT * FROM users WHERE phone = $1 LIMIT 1`, [phone]);

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

    if (user.role !== 'admin' && user.accountStatus === 'pending_payment') {
      const payment = await queryOne<SignupPayment>(
        `SELECT * FROM signup_payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [user.id],
      );

      // Legacy accounts created before payment gating — activate on first login.
      if (!payment) {
        user = (await queryOne<User>(
          `UPDATE users SET account_status = 'active' WHERE id = $1 RETURNING *`,
          [user.id],
        ))!;
      } else if (payment.status === 'pending') {
        return NextResponse.json(
          {
            error:
              'Your signup payment is still awaiting admin confirmation. You’ll get an OTP after it’s approved.',
          },
          { status: 403 },
        );
      } else if (payment.status === 'rejected') {
        return NextResponse.json(
          {
            error:
              payment.rejectionReason ||
              'Your signup payment was rejected. Contact support or sign up again with a valid proof.',
          },
          { status: 403 },
        );
      } else if (payment.status === 'confirmed') {
        user = (await queryOne<User>(
          `UPDATE users SET account_status = 'active' WHERE id = $1 RETURNING *`,
          [user.id],
        ))!;
      }
    }

    if (user.accountStatus === 'suspended') {
      return NextResponse.json({ error: 'This account is suspended.' }, { status: 403 });
    }

    const sessionUser = toSessionUser(user);
    await setSession(sessionUser);

    return NextResponse.json({
      user: sessionUser,
      redirectTo: PORTAL_HOME[sessionUser.role],
      persistence: 'postgres',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to log in.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
