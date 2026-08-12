import { NextResponse } from 'next/server';
import type { SessionUser, UserRole } from '@/types/auth';
import { getSession } from '@/lib/auth/session';

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
  return { user, error: null };
}
