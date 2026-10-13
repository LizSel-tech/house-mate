import { NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { PaystackError, submitChargeOtp } from '@/lib/paystack';
import type { PaystackTransaction } from '@/types/db';

/** Passes the code the customer received (Telecel vouchers / network OTPs) on to Paystack. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { reference?: string; otp?: string };
  const reference = String(body.reference || '').trim();
  const otp = String(body.otp || '').replace(/\s/g, '');
  if (!reference || !otp) {
    return NextResponse.json({ error: 'Enter the code sent to your phone.' }, { status: 400 });
  }
  if (!/^[0-9A-Za-z]{3,12}$/.test(otp)) {
    return NextResponse.json({ error: 'That code doesn’t look right. Check it and try again.' }, { status: 400 });
  }

  const record = await queryOne<PaystackTransaction>(
    `SELECT * FROM paystack_transactions WHERE reference = $1 AND purpose = 'signup' AND status = 'pending'`,
    [reference],
  );
  if (!record) return NextResponse.json({ error: 'This payment is no longer waiting for a code.' }, { status: 404 });

  try {
    const charge = await submitChargeOtp(reference, otp);
    if (charge.status === 'failed') {
      return NextResponse.json(
        { error: charge.message || charge.gateway_response || 'The code was not accepted. Resend the prompt and try again.' },
        { status: 402 },
      );
    }
    return NextResponse.json({ ok: true, status: charge.status, displayText: charge.display_text || null });
  } catch (err) {
    const message = err instanceof PaystackError ? err.message : 'Could not submit the code.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
