import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const [unreadCount, notifications] = await Promise.all([
    prisma.adminNotification.count({ where: { readAt: null } }),
    prisma.adminNotification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
    }),
  ]);

  return NextResponse.json({ unreadCount, notifications });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const body = (await request.json()) as { id?: string; markAllRead?: boolean };

  if (body.markAllRead) {
    await prisma.adminNotification.updateMany({
      where: { readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id or markAllRead required.' }, { status: 400 });
  }

  await prisma.adminNotification.update({
    where: { id: body.id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
