import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const [jobsCompleted, artisansApproved, customers, reviewsAgg, reviewCount, trades] =
      await Promise.all([
        prisma.booking.count({ where: { status: 'completed' } }),
        prisma.artisanProfile.count({ where: { verificationStatus: 'approved' } }),
        prisma.user.count({ where: { role: 'user' } }),
        prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
        prisma.review.count(),
        prisma.artisanProfile.groupBy({
          by: ['trade'],
          where: { verificationStatus: 'approved' },
          _count: { _all: true },
          take: 8,
        }),
      ]);

    const sortedTrades = [...trades].sort((a, b) => b._count._all - a._count._all);
    const avgRating = Number(reviewsAgg._avg.rating || 0);

    return NextResponse.json({
      jobsCompleted,
      artisansApproved,
      customers,
      averageRating: avgRating > 0 ? Number(avgRating.toFixed(1)) : null,
      reviewCount: reviewCount || reviewsAgg._count._all,
      trades: sortedTrades.map((t) => ({
        trade: t.trade,
        count: t._count._all,
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
