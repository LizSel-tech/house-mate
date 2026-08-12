import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const profile = await prisma.artisanProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return NextResponse.json({ error: 'Artisan profile not found.' }, { status: 404 });
  }

  const existing = await prisma.service.findFirst({
    where: { id, artisanId: profile.id },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
  }

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    priceAmount?: number | string;
    priceUnit?: string;
    isActive?: boolean;
  };

  const service = await prisma.service.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title.trim() } : {}),
      ...(body.description !== undefined ? { description: body.description.trim() || null } : {}),
      ...(body.priceAmount !== undefined ? { priceAmount: Number(body.priceAmount) } : {}),
      ...(body.priceUnit !== undefined ? { priceUnit: body.priceUnit.trim() || 'job' } : {}),
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
    },
  });

  return NextResponse.json({ service });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const profile = await prisma.artisanProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return NextResponse.json({ error: 'Artisan profile not found.' }, { status: 404 });
  }

  const existing = await prisma.service.findFirst({
    where: { id, artisanId: profile.id },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
  }

  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
