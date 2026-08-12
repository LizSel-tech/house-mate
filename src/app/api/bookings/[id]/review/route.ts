import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSession(['user']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const body = (await request.json()) as { rating?: number; comment?: string };
  const rating = Number(body.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5.' }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { payment: true, review: true },
  });

  if (!booking || booking.userId !== user.id) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }
  if (booking.status !== 'completed' || booking.payment?.escrowStatus !== 'released') {
    return NextResponse.json(
      { error: 'Reviews are only allowed after a completed paid job.' },
      { status: 400 }
    );
  }
  if (booking.review) {
    return NextResponse.json({ error: 'This booking already has a review.' }, { status: 409 });
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        bookingId: id,
        userId: user.id,
        artisanId: booking.artisanId,
        rating,
        comment: body.comment?.trim() || null,
      },
    });

    const stats = await tx.review.aggregate({
      where: { artisanId: booking.artisanId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await tx.artisanProfile.update({
      where: { id: booking.artisanId },
      data: { averageRating: stats._avg.rating ?? rating },
    });

    return created;
  });

  return NextResponse.json({ review }, { status: 201 });
}
