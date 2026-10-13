import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { applyTransferEvent, handleChargeSuccess } from '@/lib/payments';
import { isValidWebhookSignature, type PaystackTransactionData } from '@/lib/paystack';

export const runtime = 'nodejs';

type WebhookEvent = {
  event: string;
  data: PaystackTransactionData & { transfer_code?: string; reason?: string | null };
};

export async function POST(request: Request) {
  const raw = await request.text();
  if (!isValidWebhookSignature(raw, request.headers.get('x-paystack-signature'))) {
    void logger.warn('paystack.webhook', 'Rejected webhook with invalid signature');
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }

  let payload: WebhookEvent;
  try {
    payload = JSON.parse(raw) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  void logger.info('paystack.webhook', 'Webhook received', {
    event: payload.event,
    reference: payload.data?.reference,
    status: payload.data?.status,
  });

  try {
    switch (payload.event) {
      case 'charge.success':
        if (payload.data?.reference) await handleChargeSuccess(payload.data.reference, payload.data);
        break;
      case 'transfer.success':
      case 'transfer.failed':
      case 'transfer.reversed':
        await applyTransferEvent(payload.event, payload.data);
        break;
      default:
        break;
    }
  } catch (err) {
    await logger.error('paystack.webhook', 'Webhook handling failed', err, {
      event: payload.event,
      reference: payload.data?.reference,
    });
    return NextResponse.json({ error: 'Processing failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
