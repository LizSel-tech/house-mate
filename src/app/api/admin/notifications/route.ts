import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryOne } from '@/lib/db';
import type { AdminNotification } from '@/types/db';

export async function GET() {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const [unreadRow, notifications] = await Promise.all([
    queryOne<{ count: string }>(
      `SELECT count(*)::text AS count FROM admin_notifications WHERE read_at IS NULL`,
    ),
    query<AdminNotification>(
      `SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 40`,
    ),
  ]);

  return NextResponse.json({
    unreadCount: Number(unreadRow?.count || 0),
    notifications,
  });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const body = (await request.json()) as { id?: string; markAllRead?: boolean };

  if (body.markAllRead) {
    await query(`UPDATE admin_notifications SET read_at = now() WHERE read_at IS NULL`);
    return NextResponse.json({ ok: true });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id or markAllRead required.' }, { status: 400 });
  }

  await query(`UPDATE admin_notifications SET read_at = now() WHERE id = $1`, [body.id]);

  return NextResponse.json({ ok: true });
}
