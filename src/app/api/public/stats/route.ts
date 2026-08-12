import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

export async function GET() {
  try {
    const [jobsCompleted, artisansApproved, customers, reviewsAgg, trades] = await Promise.all([
      queryOne<{ count: string }>(
        `SELECT count(*)::text AS count FROM bookings WHERE status = 'completed'`,
      ),
      queryOne<{ count: string }>(
        `SELECT count(*)::text AS count FROM artisan_profiles WHERE verification_status = 'approved'`,
      ),
      queryOne<{ count: string }>(
        `SELECT count(*)::text AS count FROM users WHERE role = 'user'`,
      ),
      queryOne<{ avg: string | null; count: string }>(
        `SELECT avg(rating)::text AS avg, count(*)::text AS count FROM reviews`,
      ),
      query<{ trade: string; count: string }>(
        `SELECT trade, count(*)::text AS count
         FROM artisan_profiles
         WHERE verification_status = 'approved'
         GROUP BY trade
         ORDER BY count(*) DESC
         LIMIT 8`,
      ),
    ]);

    const avgRating = Number(reviewsAgg?.avg || 0);
    const reviewCount = Number(reviewsAgg?.count || 0);

    return NextResponse.json({
      jobsCompleted: Number(jobsCompleted?.count || 0),
      artisansApproved: Number(artisansApproved?.count || 0),
      customers: Number(customers?.count || 0),
      averageRating: avgRating > 0 ? Number(avgRating.toFixed(1)) : null,
      reviewCount,
      trades: trades.map((t) => ({
        trade: t.trade,
        count: Number(t.count),
      })),
    });
  } catch {
    return NextResponse.json({
      jobsCompleted: 0,
      artisansApproved: 0,
      customers: 0,
      averageRating: null,
      reviewCount: 0,
      trades: [],
    });
  }
}
