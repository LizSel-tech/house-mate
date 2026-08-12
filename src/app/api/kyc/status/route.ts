import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { queryOne } from '@/lib/db';
import type { KycVerification } from '@/types/db';

export async function GET(request: Request) {
  const { user, error } = await requireSession(['artisan', 'admin']);
  if (error || !user) return error!;

  const { searchParams } = new URL(request.url);
  const kycId = searchParams.get('kycId');

  if (kycId) {
    const kyc = await queryOne<KycVerification>(
      user.role === 'admin'
        ? `SELECT * FROM kyc_verifications WHERE id = $1`
        : `SELECT * FROM kyc_verifications WHERE id = $1 AND user_id = $2`,
      user.role === 'admin' ? [kycId] : [kycId, user.id],
    );
    if (!kyc) {
      return NextResponse.json({ error: 'KYC record not found.' }, { status: 404 });
    }
    return NextResponse.json({ kyc });
  }

  const latest = await queryOne<KycVerification>(
    user.role === 'admin'
      ? `SELECT * FROM kyc_verifications ORDER BY created_at DESC LIMIT 1`
      : `SELECT * FROM kyc_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    user.role === 'admin' ? [] : [user.id],
  );

  return NextResponse.json({ kyc: latest });
}
