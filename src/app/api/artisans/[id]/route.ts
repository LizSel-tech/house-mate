import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const artisan = await prisma.artisanProfile.findFirst({
    where: { id, verificationStatus: 'approved' },
    include: {
      user: { select: { id: true, name: true, phone: true, location: true } },
      services: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
      reviews: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!artisan) {
    return NextResponse.json({ error: 'Artisan not found or not verified.' }, { status: 404 });
  }

  return NextResponse.json({
    artisan: {
      id: artisan.id,
      trade: artisan.trade,
      bio: artisan.bio,
      serviceArea: artisan.serviceArea,
      averageRating: Number(artisan.averageRating),
      jobsCompleted: artisan.jobsCompleted,
      user: artisan.user,
      services: artisan.services.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        priceAmount: Number(s.priceAmount),
        priceUnit: s.priceUnit,
      })),
      reviews: artisan.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        userName: r.user.name,
        createdAt: r.createdAt,
      })),
    },
  });
}
