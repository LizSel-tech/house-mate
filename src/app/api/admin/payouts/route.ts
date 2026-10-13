import { NextResponse } from 'next/server';
import { logAdminAction, requireAdmin } from '@/lib/auth/admin-access';
import { query } from '@/lib/db';
import { releasePayout } from '@/lib/payments';
import { getGhsBalance, isPaystackConfigured, paystackMode } from '@/lib/paystack';

export async function GET() {
  const { user, error } = await requireAdmin('payments.manage');
  if (error || !user) return error!;

  const payouts = await query(
    `SELECT p.id, p.booking_id, p.amount, p.commission, p.escrow_status, p.payout_status,
            p.payout_amount, p.payout_attempts, p.payout_error, p.transfer_reference,
            p.paid_out_at, p.paystack_reference, p.created_at,
            COALESCE(s.title, 'Custom job') AS title,
            au.name AS provider_name, au.phone AS provider_phone,
            a.payout_bank_name, a.payout_account_number,
            (a.paystack_recipient_code IS NOT NULL) AS has_recipient,
            cu.name AS customer_name
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       JOIN artisan_profiles a ON a.id = b.artisan_id
       JOIN users au ON au.id = a.user_id
       JOIN users cu ON cu.id = b.user_id
       LEFT JOIN services s ON s.id = b.service_id
      WHERE p.escrow_status = 'released'
      ORDER BY (p.payout_status = 'failed') DESC, p.created_at DESC
      LIMIT 500`,
  );

  let balance: number | null = null;
  let balanceError: string | null = null;
  if (isPaystackConfigured()) {
    try {
      balance = await getGhsBalance();
    } catch (err) {
      balanceError = err instanceof Error ? err.message : 'Could not load balance.';
    }
  }

  return NextResponse.json({ payouts, mode: paystackMode(), balance, balanceError });
}

/** Retry a failed payout. */
export async function POST(request: Request) {
  const { user, error } = await requireAdmin('payments.manage');
  if (error || !user) return error!;

  const body = (await request.json().catch(() => ({}))) as { paymentId?: string };
  if (!body.paymentId) return NextResponse.json({ error: 'paymentId is required.' }, { status: 400 });

  const result = await releasePayout(body.paymentId);
  await logAdminAction({
    actorId: user.id,
    action: 'payout.retry',
    targetType: 'payment',
    targetId: body.paymentId,
    meta: { status: result.status, error: result.error },
  });

  if (result.status === 'skipped') {
    return NextResponse.json({ error: 'This payout is already sent or in progress.' }, { status: 409 });
  }
  if (result.status === 'failed') {
    return NextResponse.json({ error: result.error || 'Payout failed again.' }, { status: 502 });
  }
  return NextResponse.json({
    ok: true,
    status: result.status,
    message:
      result.status === 'paid'
        ? 'Payout sent.'
        : result.status === 'pending'
          ? 'Payout submitted to Paystack.'
          : 'Marked as paid outside Paystack.',
  });
}
