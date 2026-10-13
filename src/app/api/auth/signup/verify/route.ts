import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { queryOne } from '@/lib/db';
import { markSignupPaid } from '@/lib/payments';
import { PaystackError, verifyTransaction } from '@/lib/paystack';
import type { PaystackTransaction } from '@/types/db';

const WAITING_STATUSES = new Set(['ongoing', 'pending', 'processing', 'queued', 'pay_offline', 'send_otp']);
/** Networks give the customer 180 seconds to approve; allow a little slack before treating it as abandoned. */
const MOMO_PROMPT_WINDOW_MS = 210_000;

/**
 * Called by the signup page after the Paystack popup closes. No session exists yet; the reference alone is
 * enough because the outcome comes from Paystack and only activates the account that started the payment.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { reference?: string };
  const reference = String(body.reference || '').trim();
  if (!reference) return NextResponse.json({ error: 'Reference is required.' }, { status: 400 });

  const record = await queryOne<PaystackTransaction>(
    `SELECT * FROM paystack_transactions WHERE reference = $1 AND purpose = 'signup'`,
    [reference],
  );
  if (!record) return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });

  try {
    const charge = await verifyTransaction(reference);
    const promptStillOpen =
      record.channel === 'mobile_money' &&
      record.status === 'pending' &&
      charge.status === 'abandoned' &&
      Date.now() - new Date(record.createdAt).getTime() < MOMO_PROMPT_WINDOW_MS;
    if (WAITING_STATUSES.has(charge.status) || promptStillOpen) {
      return NextResponse.json({
        pending: true,
        message: 'Payment is still processing. Approve the prompt on your phone; this page will update once Paystack confirms it.',
      });
    }
    const result = await markSignupPaid(reference, charge);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    if (result.otpError) {
      return NextResponse.json({
        ok: true,
        message:
          'Payment received and your account is active, but we could not email your sign-in code. Request a new code from the login page.',
      });
    }
    return NextResponse.json({
      ok: true,
      message: result.alreadyProcessed
        ? 'Payment already confirmed. Check your email for your sign-in code, or request a new one from the login page.'
        : 'Payment received — your account is active. We’ve emailed your sign-in code.',
    });
  } catch (err) {
    await logger.error('paystack.signup', 'Verify payment failed', err, { reference });
    const message = err instanceof PaystackError ? err.message : 'Could not verify the payment.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
