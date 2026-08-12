import { NextResponse } from 'next/server';
import {
  ensureDefaultPaymentMethods,
  getOrCreatePlatformSettings,
  listPaymentMethods,
} from '@/lib/admin-notify';

/** Public signup fees + active payment methods. */
export async function GET() {
  await ensureDefaultPaymentMethods();
  const settings = await getOrCreatePlatformSettings();
  const methods = await listPaymentMethods(true);

  return NextResponse.json({
    fees: {
      user: Number(settings.userSignupFee),
      artisan: Number(settings.artisanSignupFee),
    },
    methods,
  });
}
