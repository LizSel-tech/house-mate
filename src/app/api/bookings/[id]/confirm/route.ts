import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryDataOne, withTransaction } from '@/lib/db';
import { getBookingParties, notifyUser } from '@/lib/notify';
import type { ArtisanProfile, Booking, Payment } from '@/types/db';

/** User confirms completion → release escrow to artisan (minus commission) */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireSession(['user', 'artisan']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const booking = await queryDataOne<
    Booking & { payment: Payment | null; artisan: ArtisanProfile }
  >(
    `SELECT to_jsonb(b) || jsonb_build_object(
       'payment', to_jsonb(p),
       'artisan', to_jsonb(a)
     ) AS data
     FROM bookings b
     JOIN artisan_profiles a ON a.id = b.artisan_id
     LEFT JOIN payments p ON p.booking_id = b.id
     WHERE b.id = $1`,
    [id],
  );

  if (!booking || booking.userId !== user.id) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }
  if (!booking.payment || booking.payment.escrowStatus !== 'held') {
    return NextResponse.json({ error: 'No held escrow payment to release.' }, { status: 400 });
  }
  if (booking.status !== 'in_progress' && booking.status !== 'completed') {
    return NextResponse.json(
      { error: 'Job must be in progress or marked completed by the service provider first.' },
      { status: 400 },
    );
  }

  const result = await withTransaction(async (tx) => {
    const paymentRows = await query<Payment>(
      `UPDATE payments SET escrow_status = 'released' WHERE id = $1 RETURNING *`,
      [booking.payment!.id],
      tx,
    );
    const bookingRows = await query<Booking>(
      `UPDATE bookings SET status = 'completed' WHERE id = $1 RETURNING *`,
      [id],
      tx,
    );
    await query(
      `UPDATE artisan_profiles SET jobs_completed = jobs_completed + 1 WHERE id = $1`,
      [booking.artisanId],
      tx,
    );
    return { payment: paymentRows[0], booking: bookingRows[0] };
  });

  const payout = Number(result.payment.amount) - Number(result.payment.commission);

  const parties = await getBookingParties(id);
  await notifyUser(booking.artisan.userId, {
    type: 'payout_released',
    title: 'Payment released',
    body: `${parties?.customerName || 'The customer'} confirmed "${parties?.title || 'your job'}". GHS ${payout.toFixed(2)} has been released to you.`,
    href: '/provider/earnings',
  });

  return NextResponse.json({
    ...result,
    artisanPayout: payout,
    message: 'Escrow released to the service provider (mock payout). You can leave a review.',
  });
}
