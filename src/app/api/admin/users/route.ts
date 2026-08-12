import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role'); // user | artisan | admin | all

  const users = await prisma.user.findMany({
    where:
      role && role !== 'all' && ['user', 'artisan', 'admin'].includes(role)
        ? { role: role as 'user' | 'artisan' | 'admin' }
        : undefined,
    include: {
      artisanProfile: {
        select: {
          trade: true,
          serviceArea: true,
          verificationStatus: true,
          jobsCompleted: true,
          averageRating: true,
          subscriptionStatus: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const counts = await prisma.user.groupBy({
    by: ['role'],
    _count: { _all: true },
  });

  const summary = { all: 0, user: 0, artisan: 0, admin: 0 };
  for (const row of counts) {
    summary[row.role] = row._count._all;
    summary.all += row._count._all;
  }

  return NextResponse.json({ users, summary });
}
