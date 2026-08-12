import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { ensureDefaultPaymentMethods, listPaymentMethods } from '@/lib/admin-notify';
import { buildUpdates, queryOne } from '@/lib/db';
import type { PaymentMethod, PaymentMethodType } from '@/types/db';

export async function GET() {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;
  await ensureDefaultPaymentMethods();
  const methods = await listPaymentMethods();
  return NextResponse.json({ methods });
}

export async function POST(request: Request) {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const body = (await request.json()) as {
    name?: string;
    type?: PaymentMethodType;
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

  const method = await queryOne<PaymentMethod>(
    `INSERT INTO payment_methods
      (name, type, account_name, account_number, bank_name, instructions, is_active, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      body.name.trim(),
      body.type || 'other',
      body.accountName?.trim() || null,
      body.accountNumber?.trim() || null,
      body.bankName?.trim() || null,
      body.instructions?.trim() || null,
      body.isActive !== false,
      body.sortOrder ?? 0,
    ],
  );

  return NextResponse.json({ method });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    type?: PaymentMethodType;
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

  const { sets, values } = buildUpdates({
    name: body.name !== undefined ? body.name.trim() : undefined,
    type: body.type,
    account_name: body.accountName !== undefined ? body.accountName.trim() || null : undefined,
    account_number:
      body.accountNumber !== undefined ? body.accountNumber.trim() || null : undefined,
    bank_name: body.bankName !== undefined ? body.bankName.trim() || null : undefined,
    instructions: body.instructions !== undefined ? body.instructions.trim() || null : undefined,
    is_active: body.isActive,
    sort_order: body.sortOrder,
  });

  if (!sets.length) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }

  values.push(body.id);
  const method = await queryOne<PaymentMethod>(
    `UPDATE payment_methods SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values,
  );

  return NextResponse.json({ method });
}
