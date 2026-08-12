import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { ensureDefaultPaymentMethods } from '@/lib/admin-notify';
import { prisma } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;
  await ensureDefaultPaymentMethods();
  const methods = await prisma.paymentMethod.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return NextResponse.json({ methods });
}

export async function POST(request: Request) {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const body = (await request.json()) as {
    name?: string;
    type?: 'mtn_momo' | 'telecel_cash' | 'bank_transfer' | 'other';
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    instructions?: string;
    isActive?: boolean;
    sortOrder?: number;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }

  const method = await prisma.paymentMethod.create({
    data: {
      name: body.name.trim(),
      type: body.type || 'other',
      accountName: body.accountName?.trim() || null,
      accountNumber: body.accountNumber?.trim() || null,
      bankName: body.bankName?.trim() || null,
      instructions: body.instructions?.trim() || null,
      isActive: body.isActive !== false,
      sortOrder: body.sortOrder ?? 0,
    },
  });

  return NextResponse.json({ method });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    type?: 'mtn_momo' | 'telecel_cash' | 'bank_transfer' | 'other';
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    instructions?: string;
    isActive?: boolean;
    sortOrder?: number;
  };

  if (!body.id) {
    return NextResponse.json({ error: 'id is required.' }, { status: 400 });
  }

  const method = await prisma.paymentMethod.update({
    where: { id: body.id },
    data: {
      ...(body.name !== undefined ? { name: body.name.trim() } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.accountName !== undefined ? { accountName: body.accountName.trim() || null } : {}),
      ...(body.accountNumber !== undefined
        ? { accountNumber: body.accountNumber.trim() || null }
        : {}),
      ...(body.bankName !== undefined ? { bankName: body.bankName.trim() || null } : {}),
      ...(body.instructions !== undefined
        ? { instructions: body.instructions.trim() || null }
        : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
    },
  });

  return NextResponse.json({ method });
}
