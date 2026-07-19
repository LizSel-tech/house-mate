import { NextResponse } from 'next/server';
import type { LoginPayload, SessionUser } from '@/types/auth';
import { DEMO_OTP, PORTAL_HOME } from '@/lib/auth/constants';
import { findAccountByPhone, saveAccount, setSession } from '@/lib/auth/session';

/**
 * Universal login — phone + OTP for all roles.
 * Demo OTP: 123456. Replace with Arkesel/Hubtel + Supabase Auth later.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginPayload & { demoAdmin?: boolean };
    const phone = body.phone?.trim();
    const otp = body.otp?.trim();

    if (!phone || !otp) {
      return NextResponse.json({ error: 'Phone and OTP are required.' }, { status: 400 });
    }

    if (otp !== DEMO_OTP) {
      return NextResponse.json(
        { error: `Invalid OTP. Use ${DEMO_OTP} in demo mode.` },
        { status: 401 }
      );
    }

    let user = await findAccountByPhone(phone);

    // Invite-style demo admin (not available via public signup)
    if (!user && body.demoAdmin) {
      user = {
        id: `demo-admin-${phone.replace(/\D/g, '')}`,
        name: 'Platform Admin',
        phone,
        role: 'admin',
      };
      await saveAccount(user);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'No account found for this phone. Please sign up first.' },
        { status: 404 }
      );
    }

    await setSession(user);

    return NextResponse.json({
      user,
      redirectTo: PORTAL_HOME[user.role],
    });
  } catch {
    return NextResponse.json({ error: 'Unable to log in.' }, { status: 500 });
  }
}
