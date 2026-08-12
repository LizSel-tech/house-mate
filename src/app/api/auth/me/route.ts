import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isDatabaseConfigured } from '@/lib/db';

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user,
    persistence: isDatabaseConfigured() ? 'postgres' : 'unconfigured',
  });
}
