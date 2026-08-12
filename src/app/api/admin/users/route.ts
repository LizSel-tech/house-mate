import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryData } from '@/lib/db';
import type { UserRole } from '@/types/db';

export async function GET(request: Request) {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  const filterRole =
    role && role !== 'all' && ['user', 'artisan', 'admin'].includes(role)
      ? (role as UserRole)
      : null;

  const users = await queryData(
    `SELECT to_jsonb(u) || jsonb_build_object(
       'artisan_profile', CASE WHEN ap.id IS NULL THEN NULL ELSE to_jsonb(ap) END
     ) AS data
     FROM users u
     LEFT JOIN artisan_profiles ap ON ap.user_id = u.id
     ${filterRole ? 'WHERE u.role = $1' : ''}
     ORDER BY u.created_at DESC
     LIMIT 500`,
    filterRole ? [filterRole] : [],
  );

  const counts = await query<{ role: UserRole; count: string }>(
    `SELECT role, count(*)::text AS count FROM users GROUP BY role`,
  );

  const summary = { all: 0, user: 0, artisan: 0, admin: 0 };
  for (const row of counts) {
    summary[row.role] = Number(row.count);
    summary.all += Number(row.count);
  }

  return NextResponse.json({ users, summary });
}
