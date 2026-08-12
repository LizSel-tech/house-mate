import { NextResponse } from 'next/server';
import {
  ensureDefaultPaymentMethods,
  getOrCreatePlatformSettings,
} from '@/lib/admin-notify';
import { prisma } from '@/lib/db';

/** Public signup fees + active payment methods. */
export async function GET() {
  await ensureDefaultPaymentMethods();
  const settings = await getOrCreatePlatformSettings();
  const methods = await prisma.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return NextResponse.json({
    fees: {
      user: Number(settings.userSignupFee),
      artisan: Number(settings.artisanSignupFee),
    },
    methods,
  });
}
