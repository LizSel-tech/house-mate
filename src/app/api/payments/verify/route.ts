import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireSession } from '@/lib/auth/require-session';
import { queryOne } from '@/lib/db';
import { markBookingPaid } from '@/lib/payments';
import { PaystackError, verifyTransaction } from '@/lib/paystack';
import type { PaystackTransaction } from '@/types/db';

/** Called by the browser after the Paystack popup reports success. */
export async function POST(request: Request) {
  const { user, error } = await requireSession(['user', 'artisan']);
  if (error || !user) return error!;

  const body = (await request.json().catch(() => ({}))) as { reference?: string };
  const reference = String(body.reference || '').trim();
  if (!reference) return NextResponse.json({ error: 'Reference is required.' }, { status: 400 });

  const record = await queryOne<PaystackTransaction>(
    `SELECT * FROM paystack_transactions WHERE reference = $1 AND user_id = $2`,
    [reference, user.id],
  );
  if (!record) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });

  try {
    const charge = await verifyTransaction(reference);
    if (charge.status === 'ongoing' || charge.status === 'pending') {
      return NextResponse.json({
        pending: true,
        message: 'Payment is still processing. Approve the prompt on your phone; this page will update once Paystack confirms it.',
      });
    }
    const result = await markBookingPaid(reference, charge);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({
      ok: true,
      message: 'Payment received and held in escrow. Funds are released when you confirm completion.',
    });
  } catch (err) {
    await logger.error('paystack.booking', 'Verify payment failed', err, { reference });
    const message = err instanceof PaystackError ? err.message : 'Could not verify the payment.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
