import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryOne } from '@/lib/db';
import { releasePayout } from '@/lib/payments';
import {
  PaystackError,
  createTransferRecipient,
  isPaystackConfigured,
  listBanks,
  type PaystackBank,
} from '@/lib/paystack';
import type { ArtisanProfile, PayoutType } from '@/types/db';

const FALLBACK_MOBILE_MONEY: PaystackBank[] = [
  { name: 'MTN Mobile Money', code: 'MTN', type: 'mobile_money', active: true },
  { name: 'Telecel Cash', code: 'VOD', type: 'mobile_money', active: true },
  { name: 'AirtelTigo Money', code: 'ATL', type: 'mobile_money', active: true },
];

async function payoutOptions() {
  if (!isPaystackConfigured()) {
    return { mobile_money: FALLBACK_MOBILE_MONEY, ghipss: [] as PaystackBank[] };
  }
  const [momo, banks] = await Promise.all([
    listBanks('mobile_money').catch(() => FALLBACK_MOBILE_MONEY),
    listBanks('ghipss').catch(() => [] as PaystackBank[]),
  ]);
  return { mobile_money: momo.length ? momo : FALLBACK_MOBILE_MONEY, ghipss: banks };
}

function accountView(profile: ArtisanProfile) {
  return {
    type: profile.payoutType || null,
    bankCode: profile.payoutBankCode || null,
    bankName: profile.payoutBankName || null,
    accountNumber: profile.payoutAccountNumber || null,
    accountName: profile.payoutAccountName || null,
    verified: Boolean(profile.paystackRecipientCode),
    updatedAt: profile.payoutUpdatedAt || null,
  };
}

async function loadProfile(userId: string) {
  return queryOne<ArtisanProfile>(`SELECT * FROM artisan_profiles WHERE user_id = $1`, [userId]);
}

export async function GET() {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const profile = await loadProfile(user.id);
  if (!profile) return NextResponse.json({ error: 'Provider profile not found.' }, { status: 404 });

  return NextResponse.json({
    account: profile.payoutAccountNumber ? accountView(profile) : null,
    options: await payoutOptions(),
    paystackEnabled: isPaystackConfigured(),
  });
}

export async function PUT(request: Request) {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const profile = await loadProfile(user.id);
  if (!profile) return NextResponse.json({ error: 'Provider profile not found.' }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    bankCode?: string;
    accountNumber?: string;
    accountName?: string;
  };
  const type = body.type === 'ghipss' ? 'ghipss' : body.type === 'mobile_money' ? 'mobile_money' : null;
  const bankCode = String(body.bankCode || '').trim();
  const accountNumber = String(body.accountNumber || '').replace(/\s+/g, '');
  const accountName = String(body.accountName || '').trim();

  if (!type) return NextResponse.json({ error: 'Choose mobile money or bank account.' }, { status: 400 });
  if (!bankCode) {
    return NextResponse.json(
      { error: type === 'mobile_money' ? 'Choose your network.' : 'Choose your bank.' },
      { status: 400 },
    );
  }
  if (!/^\d{9,20}$/.test(accountNumber)) {
    return NextResponse.json(
      { error: type === 'mobile_money' ? 'Enter a valid mobile money number.' : 'Enter a valid account number.' },
      { status: 400 },
    );
  }
  if (accountName.length < 3) {
    return NextResponse.json({ error: 'Enter the name on the account.' }, { status: 400 });
  }

  const options = await payoutOptions();
  const bank = options[type as PayoutType].find((b) => b.code === bankCode);
  if (!bank) return NextResponse.json({ error: 'That network or bank is not supported.' }, { status: 400 });

  let recipientCode: string | null = null;
  let resolvedName = accountName;
  if (isPaystackConfigured()) {
    try {
      const recipient = await createTransferRecipient({
        type,
        name: accountName,
        accountNumber,
        bankCode,
        metadata: { artisanId: profile.id },
      });
      recipientCode = recipient.recipient_code;
      resolvedName = recipient.details?.account_name?.trim() || accountName;
    } catch (err) {
      const message = err instanceof PaystackError ? err.message : 'Could not verify this account.';
      return NextResponse.json({ error: `Paystack: ${message}` }, { status: 400 });
    }
  }

  const updated = await queryOne<ArtisanProfile>(
    `UPDATE artisan_profiles
        SET payout_type = $2, payout_bank_code = $3, payout_bank_name = $4,
            payout_account_number = $5, payout_account_name = $6,
            paystack_recipient_code = $7, payout_updated_at = now()
      WHERE id = $1
      RETURNING *`,
    [profile.id, type, bankCode, bank.name, accountNumber, resolvedName, recipientCode],
  );

  let retried = 0;
  if (recipientCode) {
    const stuck = await query<{ id: string }>(
      `SELECT p.id FROM payments p
         JOIN bookings b ON b.id = p.booking_id
        WHERE b.artisan_id = $1 AND p.escrow_status = 'released' AND p.payout_status = 'failed'`,
      [profile.id],
    );
    for (const row of stuck) {
      const result = await releasePayout(row.id);
      if (result.status === 'paid' || result.status === 'pending') retried += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    account: accountView(updated!),
    message: retried
      ? `Payout account saved. ${retried} waiting payout${retried === 1 ? ' is' : 's are'} on the way.`
      : 'Payout account saved.',
  });
}
