import { NextResponse } from 'next/server';
import { adminCan } from '@/lib/auth/admin-access';
import { requireSession } from '@/lib/auth/require-session';
import { queryOne } from '@/lib/db';
import type { KycVerification } from '@/types/db';

export async function GET(request: Request) {
  const { user, error } = await requireSession(['artisan', 'admin']);
  if (error || !user) return error!;

  const isAdmin = user.role === 'admin';
  if (isAdmin && !(await adminCan(user.id, 'verifications.manage'))) {
    return NextResponse.json({ error: 'Your role does not allow this action.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const kycId = searchParams.get('kycId');

  if (kycId) {
    const kyc = await queryOne<KycVerification>(
      isAdmin
        ? `SELECT * FROM kyc_verifications WHERE id = $1`
        : `SELECT * FROM kyc_verifications WHERE id = $1 AND user_id = $2`,
      isAdmin ? [kycId] : [kycId, user.id],
    );
    if (!kyc) {
      return NextResponse.json({ error: 'KYC record not found.' }, { status: 404 });
    }
    return NextResponse.json({ kyc });
  }

  const latest = await queryOne<KycVerification>(
    isAdmin
      ? `SELECT * FROM kyc_verifications ORDER BY created_at DESC LIMIT 1`
      : `SELECT * FROM kyc_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    isAdmin ? [] : [user.id],
  );

  return NextResponse.json({ kyc: latest });
}
