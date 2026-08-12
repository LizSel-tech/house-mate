import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';
  const trade = searchParams.get('trade')?.trim() || '';
  const area = searchParams.get('area')?.trim() || '';

  const artisans = await prisma.artisanProfile.findMany({
    where: {
      verificationStatus: 'approved',
      ...(trade ? { trade: { contains: trade, mode: 'insensitive' } } : {}),
      ...(area ? { serviceArea: { contains: area, mode: 'insensitive' } } : {}),
      ...(q
        ? {
            OR: [
              { trade: { contains: q, mode: 'insensitive' } },
              { bio: { contains: q, mode: 'insensitive' } },
              { serviceArea: { contains: q, mode: 'insensitive' } },
              { user: { name: { contains: q, mode: 'insensitive' } } },
              { services: { some: { title: { contains: q, mode: 'insensitive' }, isActive: true } } },
            ],
          }
        : {}),
      services: { some: { isActive: true } },
    },
    include: {
      user: { select: { id: true, name: true, phone: true, location: true } },
      services: {
        where: { isActive: true },
        orderBy: { priceAmount: 'asc' },
      },
    },
    orderBy: [{ averageRating: 'desc' }, { jobsCompleted: 'desc' }],
  });

  return NextResponse.json({
    artisans: artisans.map((a) => ({
      id: a.id,
      trade: a.trade,
      bio: a.bio,
      serviceArea: a.serviceArea,
      averageRating: Number(a.averageRating),
      jobsCompleted: a.jobsCompleted,
      user: a.user,
      services: a.services.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        priceAmount: Number(s.priceAmount),
        priceUnit: s.priceUnit,
      })),
    })),
  });
}
