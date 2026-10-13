import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryDataOne, queryOne } from '@/lib/db';
import {
  commissionFor,
  getCommissionRate,
  recordMockEscrowPayment,
} from '@/lib/payments';
import { PaystackError, initializeTransaction, isPaystackConfigured } from '@/lib/paystack';
import type { Booking, Payment, User } from '@/types/db';

/** Starts escrow payment: Paystack checkout when configured, otherwise the mock escrow flow. */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireSession(['user', 'artisan']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const booking = await queryDataOne<Booking & { payment: Payment | null }>(
    `SELECT to_jsonb(b) || jsonb_build_object('payment', to_jsonb(p)) AS data
     FROM bookings b
     LEFT JOIN payments p ON p.booking_id = b.id
     WHERE b.id = $1`,
    [id],
  );

  if (!booking || booking.userId !== user.id) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }
  if (booking.status !== 'accepted') {
    return NextResponse.json(
      { error: 'Payment is only available after the service provider accepts.' },
      { status: 400 },
    );
  }
  if (booking.payment) {
    return NextResponse.json({ error: 'Payment already exists for this booking.' }, { status: 409 });
  }
  if (!booking.agreedPrice) {
    return NextResponse.json({ error: 'Agreed price is missing.' }, { status: 400 });
  }

  const amount = Number(booking.agreedPrice);

  if (!isPaystackConfigured()) {
    await recordMockEscrowPayment(id, amount);
    return NextResponse.json({
      mode: 'mock',
      message: 'Payment held in escrow (test mode — Paystack is not configured). Funds release when you confirm completion.',
    });
  }

  const payer = await queryOne<User>(`SELECT * FROM users WHERE id = $1`, [user.id]);
  const email = payer?.email?.trim() || `${user.phone.replace(/\D/g, '') || user.id}@customers.craftviva.app`;
  const commission = commissionFor(amount, await getCommissionRate());
  const reference = `cv_bk_${id.slice(0, 8)}_${Date.now()}_${randomBytes(3).toString('hex')}`;

  await query(
    `INSERT INTO paystack_transactions (reference, purpose, user_id, booking_id, amount, commission, currency)
     VALUES ($1, 'booking', $2, $3, $4, $5, 'GHS')`,
    [reference, user.id, id, amount, commission],
  );

  try {
    const init = await initializeTransaction({
      email,
      amountGhs: amount,
      reference,
      metadata: { bookingId: id, userId: user.id, purpose: 'booking' },
    });
    await query(
      `UPDATE paystack_transactions SET access_code = $2, updated_at = now() WHERE reference = $1`,
      [reference, init.access_code],
    );
    return NextResponse.json({
      mode: 'paystack',
      reference,
      accessCode: init.access_code,
      authorizationUrl: init.authorization_url,
    });
  } catch (err) {
    await query(
      `UPDATE paystack_transactions SET status = 'failed', gateway_response = $2, updated_at = now() WHERE reference = $1`,
      [reference, err instanceof Error ? err.message : 'initialize failed'],
    );
    await logger.error('paystack.booking', 'Initialize transaction failed', err, { bookingId: id });
    const message = err instanceof PaystackError ? err.message : 'Could not start the payment.';
    return NextResponse.json({ error: `Paystack: ${message}` }, { status: 502 });
  }
}
