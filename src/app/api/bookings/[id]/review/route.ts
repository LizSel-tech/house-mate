import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryDataOne, queryOne, withTransaction } from '@/lib/db';
import type { Booking, Payment, Review } from '@/types/db';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireSession(['user']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const body = (await request.json()) as { rating?: number; comment?: string };
  const rating = Number(body.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5.' }, { status: 400 });
  }

  const booking = await queryDataOne<Booking & { payment: Payment | null; review: Review | null }>(
    `SELECT to_jsonb(b) || jsonb_build_object(
       'payment', to_jsonb(p),
       'review', to_jsonb(r)
     ) AS data
     FROM bookings b
     LEFT JOIN payments p ON p.booking_id = b.id
     LEFT JOIN reviews r ON r.booking_id = b.id
     WHERE b.id = $1`,
    [id],
  );

  if (!booking || booking.userId !== user.id) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }
  if (booking.status !== 'completed' || booking.payment?.escrowStatus !== 'released') {
    return NextResponse.json(
      { error: 'Reviews are only allowed after a completed paid job.' },
      { status: 400 },
    );
  }
  if (booking.review) {
    return NextResponse.json({ error: 'This booking already has a review.' }, { status: 409 });
  }

  const review = await withTransaction(async (tx) => {
    const created = await queryOne<Review>(
      `INSERT INTO reviews (booking_id, user_id, artisan_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, user.id, booking.artisanId, rating, body.comment?.trim() || null],
      tx,
    );

    const stats = await queryOne<{ avg: string | null; count: string }>(
      `SELECT avg(rating)::text AS avg, count(*)::text AS count
       FROM reviews WHERE artisan_id = $1`,
      [booking.artisanId],
      tx,
    );

    await query(
      `UPDATE artisan_profiles SET average_rating = $1 WHERE id = $2`,
      [stats?.avg ?? rating, booking.artisanId],
      tx,
    );

    return created;
  });

  return NextResponse.json({ review }, { status: 201 });
}
