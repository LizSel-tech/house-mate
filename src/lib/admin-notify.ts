import { prisma } from '@/lib/db';

export async function notifyAdmin(input: {
  type: string;
  title: string;
  body: string;
  href?: string;
  meta?: Record<string, unknown>;
}) {
  return prisma.adminNotification.create({
    data: {
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href || null,
      meta: input.meta || undefined,
    },
  });
}

export async function getOrCreatePlatformSettings() {
  const existing = await prisma.platformSetting.findFirst();
  if (existing) return existing;
  return prisma.platformSetting.create({
    data: {
      commissionRate: 12,
      subscriptionFee: 50,
      userSignupFee: 20,
      artisanSignupFee: 50,
    },
  });
}

/** Seed default Ghana payment methods if none exist. */
export async function ensureDefaultPaymentMethods() {
  const count = await prisma.paymentMethod.count();
  if (count > 0) return;

  await prisma.paymentMethod.createMany({
    data: [
      {
        name: 'MTN MoMo',
        type: 'mtn_momo',
        accountName: 'Fixora Platform',
        accountNumber: '0240000000',
        instructions: 'Send the signup fee via MTN Mobile Money, then enter the transaction ID.',
        sortOrder: 1,
        isActive: true,
      },
      {
        name: 'Telecel Cash',
        type: 'telecel_cash',
        accountName: 'Fixora Platform',
        accountNumber: '0200000000',
        instructions: 'Send the signup fee via Telecel Cash, then enter the transaction ID.',
        sortOrder: 2,
        isActive: true,
      },
      {
        name: 'Bank transfer',
        type: 'bank_transfer',
        accountName: 'Fixora Ghana Ltd',
        accountNumber: '0123456789012',
        bankName: 'GCB Bank',
        instructions: 'Transfer the signup fee and use your phone number as the narration.',
        sortOrder: 3,
        isActive: true,
      },
    ],
  });
}
