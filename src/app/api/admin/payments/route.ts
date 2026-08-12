import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import {
  ensureDefaultPaymentMethods,
  getOrCreatePlatformSettings,
  notifyAdmin,
} from '@/lib/admin-notify';
import { issueOtp } from '@/lib/auth/otp';
import { prisma } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  await ensureDefaultPaymentMethods();

  const payments = await prisma.signupPayment.findMany({
    include: {
      user: { select: { id: true, name: true, phone: true, email: true, role: true, accountStatus: true } },
      method: true,
      reviewedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json({ payments });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const body = (await request.json()) as {
    id?: string;
    status?: 'confirmed' | 'rejected';
    reason?: string;
  };

  if (!body.id || (body.status !== 'confirmed' && body.status !== 'rejected')) {
    return NextResponse.json({ error: 'id and status (confirmed|rejected) are required.' }, { status: 400 });
  }

  const payment = await prisma.signupPayment.findUnique({
    where: { id: body.id },
    include: { user: true, method: true },
  });
  if (!payment) {
    return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
  }
  if (payment.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending payments can be reviewed.' }, { status: 400 });
  }

  if (body.status === 'rejected') {
    await prisma.$transaction(async (tx) => {
      await tx.signupPayment.update({
        where: { id: payment.id },
        data: {
          status: 'rejected',
          rejectionReason: body.reason?.trim() || 'Payment rejected by admin.',
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });
      await tx.user.update({
        where: { id: payment.userId },
        data: { accountStatus: 'pending_payment' },
      });
    });

    await notifyAdmin({
      type: 'signup_payment_rejected',
      title: 'Signup payment rejected',
      body: `${payment.user.name} (${payment.user.phone}) — ${body.reason || 'no reason'}`,
      href: '/admin/payments',
    });

    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  // Confirm payment → activate account → issue OTP for login
  await prisma.$transaction(async (tx) => {
    await tx.signupPayment.update({
      where: { id: payment.id },
      data: {
        status: 'confirmed',
        rejectionReason: null,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });
    await tx.user.update({
      where: { id: payment.userId },
      data: { accountStatus: 'active' },
    });
  });

  const otp = await issueOtp(payment.user.phone, 'login');

  await notifyAdmin({
    type: 'signup_payment_confirmed',
    title: 'Signup payment confirmed',
    body: `${payment.user.name} activated. OTP issued to ${payment.user.phone}.`,
    href: '/admin/payments',
    meta: { userId: payment.userId, ...(otp.devCode ? { devCode: otp.devCode } : {}) },
  });

  return NextResponse.json({
    ok: true,
    status: 'confirmed',
    otp: {
      phone: otp.phone,
      message: otp.message,
      ...(otp.devCode ? { devCode: otp.devCode } : {}),
    },
  });
}
