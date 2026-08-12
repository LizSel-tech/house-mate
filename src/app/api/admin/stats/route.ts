import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return startOfDay(d);
}

export async function GET() {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const since = daysAgo(13);

  const [
    usersByRole,
    artisansByStatus,
    bookingsByStatus,
    pendingKyc,
    heldEscrow,
    recentUsers,
    recentBookings,
    usersLast14,
    bookingsLast14,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
    prisma.artisanProfile.groupBy({ by: ['verificationStatus'], _count: { _all: true } }),
    prisma.booking.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.kycVerification.count({ where: { status: 'pending' } }),
    prisma.payment.aggregate({
      where: { escrowStatus: 'held' },
      _sum: { amount: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, role: true, phone: true, createdAt: true },
    }),
    prisma.booking.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: { select: { name: true } },
        artisan: { include: { user: { select: { name: true } } } },
        payment: { select: { amount: true, escrowStatus: true } },
      },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.booking.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const roleCounts = { user: 0, artisan: 0, admin: 0 };
  for (const row of usersByRole) {
    roleCounts[row.role] = row._count._all;
  }

  const verificationCounts = { pending: 0, approved: 0, rejected: 0 };
  for (const row of artisansByStatus) {
    verificationCounts[row.verificationStatus] = row._count._all;
  }

  const bookingCounts: Record<string, number> = {};
  for (const row of bookingsByStatus) {
    bookingCounts[row.status] = row._count._all;
  }

  const activeBookings = Object.entries(bookingCounts)
    .filter(([status]) => !['completed', 'cancelled'].includes(status))
    .reduce((sum, [, n]) => sum + n, 0);

  const dayKeys: string[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    dayKeys.push(daysAgo(i).toISOString().slice(0, 10));
  }

  const userGrowth = dayKeys.map((day) => ({
    day,
    count: usersLast14.filter((u) => u.createdAt.toISOString().slice(0, 10) === day).length,
  }));

  const bookingGrowth = dayKeys.map((day) => ({
    day,
    count: bookingsLast14.filter((b) => b.createdAt.toISOString().slice(0, 10) === day).length,
  }));

  return NextResponse.json({
    kpis: {
      totalUsers: roleCounts.user + roleCounts.artisan + roleCounts.admin,
      customers: roleCounts.user,
      artisans: roleCounts.artisan,
      admins: roleCounts.admin,
      artisansApproved: verificationCounts.approved,
      artisansPending: verificationCounts.pending,
      pendingKyc,
      activeBookings,
      totalBookings: Object.values(bookingCounts).reduce((a, b) => a + b, 0),
      heldEscrow: Number(heldEscrow._sum.amount || 0),
    },
    charts: {
      usersByRole: [
        { label: 'Customers', value: roleCounts.user, color: '#D97706' },
        { label: 'Artisans', value: roleCounts.artisan, color: '#292524' },
        { label: 'Admins', value: roleCounts.admin, color: '#78716C' },
      ],
      bookingsByStatus: Object.entries(bookingCounts).map(([label, value]) => ({
        label: label.replace(/_/g, ' '),
        value,
      })),
      verificationStatus: [
        { label: 'Approved', value: verificationCounts.approved, color: '#16A34A' },
        { label: 'Pending', value: verificationCounts.pending, color: '#D97706' },
        { label: 'Rejected', value: verificationCounts.rejected, color: '#DC2626' },
      ],
      userGrowth,
      bookingGrowth,
    },
    recent: {
      users: recentUsers,
      bookings: recentBookings.map((b) => ({
        id: b.id,
        status: b.status,
        createdAt: b.createdAt,
        customer: b.user.name,
        artisan: b.artisan.user.name,
        amount: b.payment ? Number(b.payment.amount) : null,
        escrowStatus: b.payment?.escrowStatus || null,
      })),
    },
  });
}
