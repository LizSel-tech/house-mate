import { NextResponse } from 'next/server';
import type { SessionUser, UserRole } from '@/types/auth';
import { getSession } from '@/lib/auth/session';
import { queryOne } from '@/lib/db';

export async function requireSession(roles?: UserRole[]) {
  const user = await getSession();
  if (!user) {
    return { user: null as SessionUser | null, error: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) };
  }
  if (roles && !roles.includes(user.role)) {
    return {
      user: null as SessionUser | null,
      error: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }),
    };
  }
  const row = await queryOne<{ accountStatus: string }>(
    `SELECT account_status FROM users WHERE id = $1`,
    [user.id],
  );
  if (!row || row.accountStatus === 'suspended') {
    return {
      user: null as SessionUser | null,
      error: NextResponse.json({ error: 'This account is suspended.' }, { status: 403 }),
    };
  }
  return { user, error: null };
}
