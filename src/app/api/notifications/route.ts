import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryOne } from '@/lib/db';

type UserNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function GET(request: Request) {
  const { user, error } = await requireSession(['user', 'artisan']);
  if (error || !user) return error!;

  const countOnly = new URL(request.url).searchParams.get('count') === '1';

  const unreadRow = await queryOne<{ count: string }>(
    `SELECT count(*)::text AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL`,
    [user.id],
  );
  const unreadCount = Number(unreadRow?.count || 0);

  if (countOnly) return NextResponse.json({ unreadCount });

  const notifications = await query<UserNotification>(
    `SELECT id, type, title, body, href, read_at, created_at
       FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 200`,
    [user.id],
  );

  return NextResponse.json({ unreadCount, notifications });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireSession(['user', 'artisan']);
  if (error || !user) return error!;

  const body = (await request.json().catch(() => ({}))) as { id?: string; markAllRead?: boolean };

  if (body.markAllRead) {
    await query(
      `UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL`,
      [user.id],
    );
    return NextResponse.json({ ok: true });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id or markAllRead required.' }, { status: 400 });
  }

  await query(
    `UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2 AND read_at IS NULL`,
    [body.id, user.id],
  );
  return NextResponse.json({ ok: true });
}
