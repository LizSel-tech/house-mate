import { notifyAdmin } from '@/lib/admin-notify';
import { query, queryOne, withTransaction } from '@/lib/db';
import { getBookingParties, notifyUser } from '@/lib/notify';
import {
  PaystackError,
  initiateTransfer,
  isPaystackConfigured,
  toPesewas,
  type PaystackTransactionData,
} from '@/lib/paystack';
import { logger } from '@/lib/logger';
import { welcomeActivatedUser } from '@/lib/signup';
import type { PoolClient } from 'pg';
import type { Payment, PaystackTransaction, PlatformSetting, User } from '@/types/db';

export async function getCommissionRate(): Promise<number> {
  const settings = await queryOne<PlatformSetting>(
    `SELECT * FROM platform_settings ORDER BY updated_at DESC LIMIT 1`,
  );
  return settings ? Number(settings.commissionRate) : 12;
}

export function commissionFor(amount: number, rate: number): number {
  return Number(((amount * rate) / 100).toFixed(2));
}

async function notifyEscrowPaid(bookingId: string, amount: number) {
  const parties = await getBookingParties(bookingId);
  if (!parties) return;
  await notifyUser(parties.artisanUserId, {
    type: 'escrow_paid',
    title: 'Escrow paid — start work',
    body: `${parties.customerName} paid GHS ${amount.toFixed(2)} into escrow for "${parties.title}". You can begin the job.`,
    href: '/provider/jobs',
  });
}

/** Mock escrow used when Paystack keys are not configured (local development). */
export async function recordMockEscrowPayment(bookingId: string, amount: number) {
  const commission = commissionFor(amount, await getCommissionRate());
  const reference = `mock_${Date.now()}_${bookingId.slice(0, 8)}`;
  const payment = await withTransaction(async (tx) => {
    const rows = await query<Payment>(
      `INSERT INTO payments (booking_id, amount, commission, escrow_status, paystack_reference)
       VALUES ($1, $2, $3, 'held', $4)
       ON CONFLICT (booking_id) DO NOTHING
       RETURNING *`,
      [bookingId, amount, commission, reference],
      tx,
    );
    if (rows[0]) {
      await query(`UPDATE bookings SET status = 'in_progress' WHERE id = $1 AND status = 'accepted'`, [bookingId], tx);
    }
    return rows[0] ?? null;
  });
  if (payment) await notifyEscrowPaid(bookingId, amount);
  return payment;
}

export type MarkPaidResult =
  | { ok: true; alreadyProcessed: boolean; payment: Payment | null }
  | { ok: false; error: string };

type Settlement =
  | { kind: 'missing' }
  | { kind: 'already'; record: PaystackTransaction }
  | { kind: 'failed'; error: string }
  | { kind: 'settled'; record: PaystackTransaction };

/**
 * Locks the transaction row and records Paystack's verdict on it.
 * Only the first successful call returns `settled`; repeats (webhook + browser verify) return `already`.
 */
async function settleCharge(
  tx: PoolClient,
  reference: string,
  charge: PaystackTransactionData,
  purpose: 'booking' | 'signup',
): Promise<Settlement> {
  const rows = await query<PaystackTransaction>(
    `SELECT * FROM paystack_transactions WHERE reference = $1 AND purpose = $2 FOR UPDATE`,
    [reference, purpose],
    tx,
  );
  const record = rows[0];
  if (!record) return { kind: 'missing' };
  if (record.status === 'success') return { kind: 'already', record };

  if (charge.status !== 'success') {
    await query(
      `UPDATE paystack_transactions
          SET status = $2, gateway_response = $3, raw = $4, updated_at = now()
        WHERE id = $1`,
      [record.id, charge.status === 'abandoned' ? 'abandoned' : 'failed', charge.gateway_response, JSON.stringify(charge)],
      tx,
    );
    return { kind: 'failed', error: charge.gateway_response || 'Payment was not completed.' };
  }

  if (charge.currency !== record.currency || charge.amount !== toPesewas(Number(record.amount))) {
    await query(
      `UPDATE paystack_transactions
          SET status = 'failed', gateway_response = 'Amount or currency mismatch', raw = $2, updated_at = now()
        WHERE id = $1`,
      [record.id, JSON.stringify(charge)],
      tx,
    );
    return { kind: 'failed', error: 'Payment amount did not match. Contact support.' };
  }

  await query(
    `UPDATE paystack_transactions
        SET status = 'success', channel = $2, gateway_response = $3, paid_at = $4, raw = $5, updated_at = now()
      WHERE id = $1`,
    [record.id, charge.channel, charge.gateway_response, charge.paid_at || new Date().toISOString(), JSON.stringify(charge)],
    tx,
  );
  return { kind: 'settled', record };
}

/**
 * Records a successful Paystack charge as a held escrow payment.
 * Safe to call from both the browser verify call and the webhook: only the first call has effect.
 */
export async function markBookingPaid(
  reference: string,
  charge: PaystackTransactionData,
): Promise<MarkPaidResult> {
  const outcome = await withTransaction(async (tx) => {
    const settlement = await settleCharge(tx, reference, charge, 'booking');
    if (settlement.kind === 'missing') return { ok: false as const, error: 'Unknown payment reference.' };
    if (settlement.kind === 'failed') return { ok: false as const, error: settlement.error };
    const record = settlement.record;
    if (!record.bookingId) return { ok: false as const, error: 'Unknown payment reference.' };

    if (settlement.kind === 'already') {
      const existing = await query<Payment>(`SELECT * FROM payments WHERE booking_id = $1`, [record.bookingId], tx);
      return { ok: true as const, alreadyProcessed: true, payment: existing[0] ?? null, bookingId: record.bookingId };
    }

    const inserted = await query<Payment>(
      `INSERT INTO payments (booking_id, amount, commission, escrow_status, paystack_reference)
       VALUES ($1, $2, $3, 'held', $4)
       ON CONFLICT (booking_id) DO NOTHING
       RETURNING *`,
      [record.bookingId, record.amount, record.commission, reference],
      tx,
    );
    if (!inserted[0]) {
      // Booking was already paid with another reference; money must go back to the payer.
      return { ok: true as const, alreadyProcessed: true, payment: null, bookingId: record.bookingId, duplicate: true, amount: Number(record.amount) };
    }

    await query(
      `UPDATE bookings SET status = 'in_progress' WHERE id = $1 AND status = 'accepted'`,
      [record.bookingId],
      tx,
    );
    return { ok: true as const, alreadyProcessed: false, payment: inserted[0], bookingId: record.bookingId, amount: Number(record.amount) };
  });

  if (!outcome.ok) return outcome;

  if ('duplicate' in outcome && outcome.duplicate) {
    await notifyAdmin({
      type: 'paystack_duplicate_payment',
      title: 'Duplicate booking payment',
      body: `Booking ${outcome.bookingId} was paid twice. Refund Paystack reference ${reference} from the Paystack dashboard.`,
      href: '/admin/bookings',
      meta: { reference, bookingId: outcome.bookingId },
    });
  } else if (!outcome.alreadyProcessed && outcome.payment) {
    await notifyEscrowPaid(outcome.bookingId, Number(outcome.payment.amount));
  }

  return { ok: true, alreadyProcessed: outcome.alreadyProcessed, payment: outcome.payment };
}

export type SignupPaidResult =
  | { ok: true; alreadyProcessed: boolean; user: User | null; otpEmailed: boolean; otpError?: string | null }
  | { ok: false; error: string };

/**
 * Activates a pending signup once Paystack confirms the fee. The account gets its sign-in code by email
 * straight away — no admin review. Safe to call from both the browser verify call and the webhook.
 */
export async function markSignupPaid(
  reference: string,
  charge: PaystackTransactionData,
): Promise<SignupPaidResult> {
  const outcome = await withTransaction(async (tx) => {
    const settlement = await settleCharge(tx, reference, charge, 'signup');
    if (settlement.kind === 'missing') return { ok: false as const, error: 'Unknown payment reference.' };
    if (settlement.kind === 'failed') return { ok: false as const, error: settlement.error };
    const record = settlement.record;
    if (!record.userId) return { ok: false as const, error: 'Unknown payment reference.' };

    const users = await query<User>(`SELECT * FROM users WHERE id = $1 FOR UPDATE`, [record.userId], tx);
    const user = users[0] ?? null;
    if (settlement.kind === 'already' || !user) {
      return { ok: true as const, alreadyProcessed: true, user, activated: false, duplicate: false, amount: Number(record.amount) };
    }

    if (user.accountStatus !== 'pending_payment') {
      return { ok: true as const, alreadyProcessed: true, user, activated: false, duplicate: true, amount: Number(record.amount) };
    }

    await query(
      `INSERT INTO signup_payments (user_id, method_id, amount, role, reference, proof_url, status, provider, reviewed_at)
       VALUES ($1, NULL, $2, $3, $4, NULL, 'confirmed', 'paystack', now())
       ON CONFLICT (reference) WHERE provider = 'paystack' DO NOTHING`,
      [user.id, record.amount, user.role, reference],
      tx,
    );
    const activated = await query<User>(
      `UPDATE users SET account_status = 'active' WHERE id = $1 RETURNING *`,
      [user.id],
      tx,
    );
    return { ok: true as const, alreadyProcessed: false, user: activated[0] ?? user, activated: true, duplicate: false, amount: Number(record.amount) };
  });

  if (!outcome.ok) return outcome;

  if (outcome.duplicate && outcome.user) {
    await notifyAdmin({
      type: 'paystack_duplicate_payment',
      title: 'Duplicate signup payment',
      body: `${outcome.user.name} (${outcome.user.phone}) paid the signup fee again after activation. Refund Paystack reference ${reference} from the Paystack dashboard.`,
      href: '/admin/payments',
      meta: { reference, userId: outcome.user.id },
    });
    return { ok: true, alreadyProcessed: true, user: outcome.user, otpEmailed: false };
  }

  if (!outcome.activated || !outcome.user) {
    return { ok: true, alreadyProcessed: true, user: outcome.user, otpEmailed: false };
  }

  const user = outcome.user;
  const { otp, otpError } = await welcomeActivatedUser(user);

  await notifyAdmin({
    type: 'signup_payment_confirmed',
    title: 'Signup paid via Paystack',
    body: otp
      ? `${user.name} (${user.role === 'artisan' ? 'service provider' : 'client'}) paid GHS ${outcome.amount.toFixed(2)} and was activated. OTP emailed to ${otp.email || user.email}.`
      : `${user.name} paid GHS ${outcome.amount.toFixed(2)} and was activated, but the OTP email failed: ${otpError}`,
    href: '/admin/payments',
    meta: {
      userId: user.id,
      reference,
      ...(otp?.devCode ? { devCode: otp.devCode } : {}),
      ...(otpError ? { otpError } : {}),
    },
  });

  return { ok: true, alreadyProcessed: false, user, otpEmailed: Boolean(otp), otpError };
}

/** Routes a `charge.success` webhook to the booking or signup handler based on the stored purpose. */
export async function handleChargeSuccess(reference: string, charge: PaystackTransactionData) {
  const record = await queryOne<Pick<PaystackTransaction, 'purpose'>>(
    `SELECT purpose FROM paystack_transactions WHERE reference = $1`,
    [reference],
  );
  if (!record) return;
  if (record.purpose === 'signup') await markSignupPaid(reference, charge);
  else await markBookingPaid(reference, charge);
}

type PayoutRow = Payment & {
  bookingId: string;
  artisanId: string;
  artisanUserId: string;
  recipientCode: string | null;
};

export type PayoutResult = {
  status: 'pending' | 'paid' | 'failed' | 'manual' | 'skipped';
  amount: number;
  error?: string;
};

async function failPayout(row: PayoutRow, amount: number, error: string, notifyProvider: boolean) {
  await logger.warn('paystack.payout', 'Payout failed', { paymentId: row.id, bookingId: row.bookingId, amount, reason: error });
  await query(
    `UPDATE payments SET payout_status = 'failed', payout_error = $2 WHERE id = $1`,
    [row.id, error],
  );
  await notifyAdmin({
    type: 'payout_failed',
    title: 'Provider payout failed',
    body: `GHS ${amount.toFixed(2)} for booking ${row.bookingId} could not be sent: ${error}`,
    href: '/admin/payouts',
    meta: { paymentId: row.id, bookingId: row.bookingId },
  });
  if (notifyProvider) {
    await notifyUser(row.artisanUserId, {
      type: 'payout_account_needed',
      title: 'Add a payout account',
      body: `GHS ${amount.toFixed(2)} is ready for you, but we couldn't send it: ${error}`,
      href: '/provider/earnings',
    });
  }
}

/**
 * Sends a released escrow payment (minus commission) to the provider via Paystack Transfers.
 * Only runs for payments whose payout is not started yet or previously failed.
 */
export async function releasePayout(paymentId: string): Promise<PayoutResult> {
  const row = await queryOne<PayoutRow>(
    `SELECT p.*, b.artisan_id, a.user_id AS artisan_user_id, a.paystack_recipient_code AS recipient_code
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       JOIN artisan_profiles a ON a.id = b.artisan_id
      WHERE p.id = $1`,
    [paymentId],
  );
  if (!row || row.escrowStatus !== 'released') return { status: 'skipped', amount: 0 };

  const amount = Number((Number(row.amount) - Number(row.commission)).toFixed(2));

  if (!isPaystackConfigured()) {
    await query(
      `UPDATE payments SET payout_status = 'manual', payout_amount = $2
        WHERE id = $1 AND payout_status IN ('none', 'failed')`,
      [row.id, amount],
    );
    return { status: 'manual', amount };
  }

  if (!row.recipientCode) {
    await query(`UPDATE payments SET payout_amount = $2 WHERE id = $1`, [row.id, amount]);
    await failPayout(row, amount, 'The provider has not added a payout account yet.', true);
    return { status: 'failed', amount, error: 'Provider has no payout account.' };
  }

  const attempt = (row.payoutAttempts || 0) + 1;
  const reference = `cv_payout_${row.id.replace(/-/g, '')}_${attempt}`;

  const claimed = await queryOne<Payment>(
    `UPDATE payments
        SET payout_status = 'pending', payout_amount = $2, payout_attempts = $3,
            transfer_reference = $4, payout_error = NULL
      WHERE id = $1 AND payout_status IN ('none', 'failed')
      RETURNING *`,
    [row.id, amount, attempt, reference],
  );
  if (!claimed) return { status: 'skipped', amount };

  try {
    const transfer = await initiateTransfer({
      amountGhs: amount,
      recipientCode: row.recipientCode,
      reference,
      reason: `Craftviva payout for booking ${row.bookingId.slice(0, 8)}`,
    });
    if (transfer.status === 'otp') {
      await failPayout(
        row,
        amount,
        'Paystack requires an OTP for transfers. Disable "Transfer OTP" in the Paystack dashboard, then retry.',
        false,
      );
      return { status: 'failed', amount, error: 'Transfer OTP is enabled on Paystack.' };
    }
    const paid = transfer.status === 'success';
    await query(
      `UPDATE payments
          SET transfer_code = $2,
              payout_status = $3,
              paid_out_at = CASE WHEN $3 = 'paid' THEN now() ELSE paid_out_at END
        WHERE id = $1`,
      [row.id, transfer.transfer_code, paid ? 'paid' : 'pending'],
    );
    if (paid) await notifyPayoutSent(row.artisanUserId, amount);
    return { status: paid ? 'paid' : 'pending', amount };
  } catch (err) {
    const message = err instanceof PaystackError ? err.message : 'Transfer request failed.';
    await failPayout(row, amount, message, false);
    return { status: 'failed', amount, error: message };
  }
}

async function notifyPayoutSent(artisanUserId: string, amount: number) {
  await notifyUser(artisanUserId, {
    type: 'payout_sent',
    title: 'Payout sent',
    body: `GHS ${amount.toFixed(2)} has been sent to your payout account.`,
    href: '/provider/earnings',
  });
}

/** Applies `transfer.success` / `transfer.failed` / `transfer.reversed` webhook events. */
export async function applyTransferEvent(
  event: 'transfer.success' | 'transfer.failed' | 'transfer.reversed',
  data: { reference?: string; transfer_code?: string; reason?: string | null },
) {
  if (!data.reference) return;
  const row = await queryOne<PayoutRow>(
    `SELECT p.*, b.artisan_id, a.user_id AS artisan_user_id, a.paystack_recipient_code AS recipient_code
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
       JOIN artisan_profiles a ON a.id = b.artisan_id
      WHERE p.transfer_reference = $1`,
    [data.reference],
  );
  if (!row) return;
  const amount = Number(row.payoutAmount ?? Number(row.amount) - Number(row.commission));

  if (event === 'transfer.success') {
    const updated = await queryOne(
      `UPDATE payments
          SET payout_status = 'paid', paid_out_at = now(), payout_error = NULL,
              transfer_code = COALESCE($2, transfer_code)
        WHERE id = $1 AND payout_status <> 'paid'
        RETURNING id`,
      [row.id, data.transfer_code || null],
    );
    if (updated) await notifyPayoutSent(row.artisanUserId, amount);
    return;
  }

  if (row.payoutStatus === 'failed') return;
  await failPayout(
    row,
    amount,
    event === 'transfer.reversed'
      ? 'Paystack reversed the transfer.'
      : data.reason || 'Paystack could not complete the transfer.',
    false,
  );
}