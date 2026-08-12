import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import {
  ensureDefaultPaymentMethods,
  getOrCreatePlatformSettings,
  listPaymentMethods,
} from '@/lib/admin-notify';
import { buildUpdates, queryOne } from '@/lib/db';
import type { PlatformSetting } from '@/types/db';

export async function GET() {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  await ensureDefaultPaymentMethods();
  const [settings, methods] = await Promise.all([
    getOrCreatePlatformSettings(),
    listPaymentMethods(),
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
  const { sets, values } = buildUpdates({
    commission_rate: body.commissionRate !== undefined ? Number(body.commissionRate) : undefined,
    subscription_fee: body.subscriptionFee !== undefined ? Number(body.subscriptionFee) : undefined,
    user_signup_fee: body.userSignupFee !== undefined ? Number(body.userSignupFee) : undefined,
    artisan_signup_fee:
      body.artisanSignupFee !== undefined ? Number(body.artisanSignupFee) : undefined,
  });

  let updated = settings;
  if (sets.length) {
    values.push(settings.id);
    updated = (await queryOne<PlatformSetting>(
      `UPDATE platform_settings SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values,
    ))!;
  }

  return NextResponse.json({
    settings: {
      commissionRate: Number(updated.commissionRate),
      subscriptionFee: Number(updated.subscriptionFee),
      userSignupFee: Number(updated.userSignupFee),
      artisanSignupFee: Number(updated.artisanSignupFee),
    },
  });
}
