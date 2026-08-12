import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireSession(['user', 'artisan', 'admin']);
  if (error || !user) return error!;

  if (user.role === 'user') {
    const bookings = await prisma.booking.findMany({
      where: { userId: user.id },
      include: {
        artisan: { include: { user: { select: { name: true, phone: true } } } },
        service: true,
        payment: true,
        review: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ bookings });
  }

  if (user.role === 'artisan') {
    const profile = await prisma.artisanProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      return NextResponse.json({ error: 'Artisan profile not found.' }, { status: 404 });
    }
    const bookings = await prisma.booking.findMany({
      where: { artisanId: profile.id },
      include: {
        user: { select: { name: true, phone: true } },
        service: true,
        payment: true,
        review: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ bookings });
  }

  const bookings = await prisma.booking.findMany({
    include: {
      user: { select: { name: true, phone: true } },
      artisan: { include: { user: { select: { name: true, phone: true } } } },
      service: true,
      payment: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const { user, error } = await requireSession(['user']);
  if (error || !user) return error!;

  const body = (await request.json()) as {
    artisanId?: string;
    serviceId?: string;
    location?: string;
    problemDescription?: string;
    agreedPrice?: number | string;
  };

  if (!body.artisanId || !body.serviceId) {
    return NextResponse.json({ error: 'Artisan and service are required.' }, { status: 400 });
  }

  const artisan = await prisma.artisanProfile.findFirst({
    where: { id: body.artisanId, verificationStatus: 'approved' },
  });
  if (!artisan) {
    return NextResponse.json({ error: 'Verified artisan not found.' }, { status: 404 });
  }

  const service = await prisma.service.findFirst({
    where: { id: body.serviceId, artisanId: artisan.id, isActive: true },
  });
  if (!service) {
    return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
  }

  const agreedPrice =
    body.agreedPrice !== undefined && body.agreedPrice !== ''
      ? Number(body.agreedPrice)
      : Number(service.priceAmount);

  if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
    return NextResponse.json({ error: 'Enter a valid agreed price.' }, { status: 400 });
  }

  const booking = await prisma.booking.create({
    data: {
      userId: user.id,
      artisanId: artisan.id,
      serviceId: service.id,
      location: body.location?.trim() || null,
      problemDescription: body.problemDescription?.trim() || null,
      agreedPrice,
      status: 'requested',
    },
    include: {
      service: true,
      artisan: { include: { user: { select: { name: true } } } },
    },
  });

  return NextResponse.json({ booking }, { status: 201 });
}
