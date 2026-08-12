import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryDataOne, queryOne } from '@/lib/db';
import type { Booking, Payment, PlatformSetting } from '@/types/db';

async function getCommissionRate() {
  const settings = await queryOne<PlatformSetting>(
    `SELECT * FROM platform_settings ORDER BY updated_at DESC LIMIT 1`,
  );
  return settings ? Number(settings.commissionRate) : 12;
}

/** Pay into escrow (mock Paystack collect for MVP) */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireSession(['user']);
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
      { error: 'Payment is only available after the artisan accepts.' },
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
  const commissionRate = await getCommissionRate();
  const commission = Number(((amount * commissionRate) / 100).toFixed(2));
  const reference = `HM_${Date.now()}_${id.slice(0, 8)}`;

  const payment = await queryOne<Payment>(
    `INSERT INTO payments (booking_id, amount, commission, escrow_status, paystack_reference)
     VALUES ($1, $2, $3, 'held', $4)
     RETURNING *`,
    [id, amount, commission, reference],
  );

  await query(`UPDATE bookings SET status = 'in_progress' WHERE id = $1`, [id]);

  return NextResponse.json({
    payment,
    message: 'Payment held in escrow (mock Paystack). Funds release when you confirm completion.',
  });
}
