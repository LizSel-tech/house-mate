import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryData, queryOne } from '@/lib/db';
import type { UserRole, VerificationStatus } from '@/types/db';

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
    pendingKycRow,
    heldEscrow,
    recentUsers,
    recentBookings,
    usersLast14,
    bookingsLast14,
  ] = await Promise.all([
    query<{ role: UserRole; count: string }>(
      `SELECT role, count(*)::text AS count FROM users GROUP BY role`,
    ),
    query<{ verificationStatus: VerificationStatus; count: string }>(
      `SELECT verification_status, count(*)::text AS count FROM artisan_profiles GROUP BY verification_status`,
    ),
    query<{ status: string; count: string }>(
      `SELECT status::text AS status, count(*)::text AS count FROM bookings GROUP BY status`,
    ),
    queryOne<{ count: string }>(
      `SELECT count(*)::text AS count FROM kyc_verifications WHERE status = 'pending'`,
    ),
    queryOne<{ amount: string | null }>(
      `SELECT coalesce(sum(amount), 0)::text AS amount FROM payments WHERE escrow_status = 'held'`,
    ),
    query(
      `SELECT id, name, role, phone, created_at FROM users ORDER BY created_at DESC LIMIT 5`,
    ),
    queryData(
      `SELECT to_jsonb(b) || jsonb_build_object(
         'user', jsonb_build_object('name', u.name),
         'artisan', jsonb_build_object('user', jsonb_build_object('name', au.name)),
         'payment', CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object(
           'amount', p.amount, 'escrow_status', p.escrow_status
         ) END
       ) AS data
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN artisan_profiles a ON a.id = b.artisan_id
       JOIN users au ON au.id = a.user_id
       LEFT JOIN payments p ON p.booking_id = b.id
       ORDER BY b.created_at DESC
       LIMIT 5`,
    ),
    query<{ createdAt: Date }>(
      `SELECT created_at FROM users WHERE created_at >= $1 ORDER BY created_at ASC`,
      [since],
    ),
    query<{ createdAt: Date }>(
      `SELECT created_at FROM bookings WHERE created_at >= $1 ORDER BY created_at ASC`,
      [since],
    ),
  ]);

  const roleCounts = { user: 0, artisan: 0, admin: 0 };
  for (const row of usersByRole) {
    roleCounts[row.role] = Number(row.count);
  }

  const verificationCounts = { pending: 0, approved: 0, rejected: 0 };
  for (const row of artisansByStatus) {
    verificationCounts[row.verificationStatus] = Number(row.count);
  }

  const bookingCounts: Record<string, number> = {};
  for (const row of bookingsByStatus) {
    bookingCounts[row.status] = Number(row.count);
  }

  const pendingKyc = Number(pendingKycRow?.count || 0);

  const activeBookings = Object.entries(bookingCounts)
    .filter(([status]) => !['completed', 'cancelled'].includes(status))
    .reduce((sum, [, n]) => sum + n, 0);

  const dayKeys: string[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    dayKeys.push(daysAgo(i).toISOString().slice(0, 10));
  }

  const userGrowth = dayKeys.map((day) => ({
    day,
    count: usersLast14.filter((u) => new Date(u.createdAt).toISOString().slice(0, 10) === day)
      .length,
  }));

  const bookingGrowth = dayKeys.map((day) => ({
    day,
    count: bookingsLast14.filter((b) => new Date(b.createdAt).toISOString().slice(0, 10) === day)
      .length,
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
      heldEscrow: Number(heldEscrow?.amount || 0),
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
      bookings: (recentBookings as Array<Record<string, unknown>>).map((b) => ({
        id: b.id,
        status: b.status,
        createdAt: b.createdAt,
        customer: (b.user as { name: string }).name,
        artisan: ((b.artisan as { user: { name: string } }).user).name,
        amount: b.payment ? Number((b.payment as { amount: string | number }).amount) : null,
        escrowStatus: (b.payment as { escrowStatus?: string } | null)?.escrowStatus || null,
      })),
    },
  });
}
