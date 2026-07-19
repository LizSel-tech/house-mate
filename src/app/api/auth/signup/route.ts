import { NextResponse } from 'next/server';
import type { SignupPayload, SessionUser } from '@/types/auth';
import { PORTAL_HOME } from '@/lib/auth/constants';
import { findAccountByPhone, saveAccount, setSession } from '@/lib/auth/session';

/**
 * Public signup for service users and artisans only.
 * Admin accounts are invite-only.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SignupPayload;
    const name = body.name?.trim();
    const phone = body.phone?.trim();
    const email = body.email?.trim() || undefined;
    const role = body.role;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required.' }, { status: 400 });
    }

    if (role !== 'user' && role !== 'artisan') {
      return NextResponse.json(
        { error: 'Choose Service User or Service Provider.' },
        { status: 400 }
      );
    }

    const existing = await findAccountByPhone(phone);
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this phone already exists. Please log in.' },
        { status: 409 }
      );
    }

    const user: SessionUser = {
      id: `demo-${role}-${phone.replace(/\D/g, '')}`,
      name,
      phone,
      email,
      role,
    };

    await saveAccount(user);
    await setSession(user);

    return NextResponse.json({
      user,
      redirectTo: PORTAL_HOME[user.role],
    });
  } catch {
    return NextResponse.json({ error: 'Unable to sign up.' }, { status: 500 });
  }
}
