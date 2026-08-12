import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';

/** User confirms completion → release escrow to artisan (minus commission) */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSession(['user']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { payment: true, artisan: true },
  });

  if (!booking || booking.userId !== user.id) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }
  if (!booking.payment || booking.payment.escrowStatus !== 'held') {
    return NextResponse.json({ error: 'No held escrow payment to release.' }, { status: 400 });
  }
  if (booking.status !== 'in_progress' && booking.status !== 'completed') {
    return NextResponse.json(
      { error: 'Job must be in progress or marked completed by artisan first.' },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: booking.payment!.id },
      data: { escrowStatus: 'released' },
    });

    const updatedBooking = await tx.booking.update({
      where: { id },
      data: { status: 'completed' },
    });

    await tx.artisanProfile.update({
      where: { id: booking.artisanId },
      data: { jobsCompleted: { increment: 1 } },
    });

    return { payment, booking: updatedBooking };
  });

  const payout = Number(result.payment.amount) - Number(result.payment.commission);

  return NextResponse.json({
    ...result,
    artisanPayout: payout,
    message: 'Escrow released to artisan (mock payout). You can leave a review.',
  });
}
