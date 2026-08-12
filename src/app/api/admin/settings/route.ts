import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import {
  ensureDefaultPaymentMethods,
  getOrCreatePlatformSettings,
} from '@/lib/admin-notify';
import { prisma } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  await ensureDefaultPaymentMethods();
  const [settings, methods] = await Promise.all([
    getOrCreatePlatformSettings(),
    prisma.paymentMethod.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
  ]);

  return NextResponse.json({
    settings: {
      commissionRate: Number(settings.commissionRate),
      subscriptionFee: Number(settings.subscriptionFee),
      userSignupFee: Number(settings.userSignupFee),
      artisanSignupFee: Number(settings.artisanSignupFee),
    },
    methods,
  });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const body = (await request.json()) as {
    commissionRate?: number | string;
    subscriptionFee?: number | string;
    userSignupFee?: number | string;
    artisanSignupFee?: number | string;
  };

  const settings = await getOrCreatePlatformSettings();
  const updated = await prisma.platformSetting.update({
    where: { id: settings.id },
    data: {
      ...(body.commissionRate !== undefined ? { commissionRate: Number(body.commissionRate) } : {}),
      ...(body.subscriptionFee !== undefined ? { subscriptionFee: Number(body.subscriptionFee) } : {}),
      ...(body.userSignupFee !== undefined ? { userSignupFee: Number(body.userSignupFee) } : {}),
      ...(body.artisanSignupFee !== undefined
        ? { artisanSignupFee: Number(body.artisanSignupFee) }
        : {}),
    },
  });

  return NextResponse.json({
    settings: {
      commissionRate: Number(updated.commissionRate),
      subscriptionFee: Number(updated.subscriptionFee),
      userSignupFee: Number(updated.userSignupFee),
      artisanSignupFee: Number(updated.artisanSignupFee),
    },
  });
}
