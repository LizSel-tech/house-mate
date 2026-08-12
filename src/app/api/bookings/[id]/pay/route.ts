import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';

async function getCommissionRate() {
  const settings = await prisma.platformSetting.findFirst();
  return settings ? Number(settings.commissionRate) : 12;
}

/** Pay into escrow (mock Paystack collect for MVP) */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSession(['user']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { payment: true },
  });

  if (!booking || booking.userId !== user.id) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }
  if (booking.status !== 'accepted') {
    return NextResponse.json(
      { error: 'Payment is only available after the artisan accepts.' },
      { status: 400 }
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

  const payment = await prisma.payment.create({
    data: {
      bookingId: id,
      amount,
      commission,
      escrowStatus: 'held',
      paystackReference: reference,
    },
  });

  await prisma.booking.update({
    where: { id },
    data: { status: 'in_progress' },
  });

  return NextResponse.json({
    payment,
    message: 'Payment held in escrow (mock Paystack). Funds release when you confirm completion.',
  });
}
