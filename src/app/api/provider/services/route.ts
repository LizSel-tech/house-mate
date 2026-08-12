import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';

async function getArtisanId(userId: string) {
  const profile = await prisma.artisanProfile.findUnique({ where: { userId } });
  return profile?.id ?? null;
}

export async function GET() {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const artisanId = await getArtisanId(user.id);
  if (!artisanId) {
    return NextResponse.json({ error: 'Artisan profile not found.' }, { status: 404 });
  }

  const services = await prisma.service.findMany({
    where: { artisanId },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const artisanId = await getArtisanId(user.id);
  if (!artisanId) {
    return NextResponse.json({ error: 'Artisan profile not found.' }, { status: 404 });
  }

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    priceAmount?: number | string;
    priceUnit?: string;
  };

  const title = body.title?.trim();
  const priceAmount = Number(body.priceAmount);

  if (!title) {
    return NextResponse.json({ error: 'Service title is required.' }, { status: 400 });
  }
  if (!Number.isFinite(priceAmount) || priceAmount <= 0) {
    return NextResponse.json({ error: 'Enter a valid price.' }, { status: 400 });
  }

  const service = await prisma.service.create({
    data: {
      artisanId,
      title,
      description: body.description?.trim() || null,
      priceAmount,
      priceUnit: body.priceUnit?.trim() || 'job',
    },
  });

  return NextResponse.json({ service }, { status: 201 });
}
