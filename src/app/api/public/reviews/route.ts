import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      where: { comment: { not: null } },
      include: {
        user: { select: { name: true, location: true } },
        artisan: {
          select: {
            trade: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    return NextResponse.json({
      reviews: reviews
        .filter((r) => (r.comment || '').trim().length > 0)
        .map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          name: r.user.name,
          location: r.user.location,
          artisanName: r.artisan.user.name,
          trade: r.artisan.trade,
          createdAt: r.createdAt,
        })),
    });
  } catch {
    return NextResponse.json({ reviews: [] });
  }
}
