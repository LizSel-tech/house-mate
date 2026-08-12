import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { rateLimit } from '@/lib/kyc/rate-limit';
import { query, queryOne, withTransaction } from '@/lib/db';
import type { KycVerification } from '@/types/db';

/** Submit KYC package for admin review (Ghana Card + selfie + liveness frames). */
export async function POST(request: Request) {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  if (!rateLimit(`kyc-submit:${user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too many verification attempts.' }, { status: 429 });
  }

  const body = (await request.json()) as { kycId?: string };
  if (!body.kycId) {
    return NextResponse.json({ error: 'kycId is required.' }, { status: 400 });
  }

  const kyc = await queryOne<KycVerification>(
    `SELECT * FROM kyc_verifications
     WHERE id = $1 AND user_id = $2 AND status IN ('draft', 'error')`,
    [body.kycId, user.id],
  );
  if (!kyc) {
    return NextResponse.json({ error: 'KYC session not found.' }, { status: 404 });
  }

  if (!kyc.documentFrontUrl || !kyc.selfieUrl || (kyc.livenessImageUrls?.length || 0) < 6) {
    return NextResponse.json(
      {
        error:
          'Upload Ghana Card front, a selfie, and at least 6 guided liveness frames before submitting.',
      },
      { status: 400 },
    );
  }

  if (!kyc.firstName || !kyc.lastName) {
    return NextResponse.json({ error: 'First and last name are required.' }, { status: 400 });
  }

  const updated = await withTransaction(async (tx) => {
    const row = await queryOne<KycVerification>(
      `UPDATE kyc_verifications
       SET status = 'pending',
           provider = 'manual',
           submitted_at = now(),
           completed_at = NULL,
           failure_reason = NULL,
           provider_raw_result = $1::jsonb,
           extracted_fields = $2::jsonb
       WHERE id = $3
       RETURNING *`,
      [
        JSON.stringify({
          mode: 'manual',
          message: 'Awaiting admin review of Ghana Card, selfie, and liveness frames.',
        }),
        JSON.stringify({
          full_name: `${kyc.firstName} ${kyc.lastName}`,
          id_number: kyc.ghanaCardNumber,
          country: 'GH',
          id_type: 'NATIONAL_ID',
        }),
        kyc.id,
      ],
      tx,
    );

    if (kyc.artisanId) {
      await query(
        `UPDATE artisan_profiles SET verification_status = 'pending' WHERE id = $1`,
        [kyc.artisanId],
        tx,
      );
    }

    return row;
  });

  return NextResponse.json({
    kyc: updated,
    mode: 'manual',
    message: 'Submitted for admin review. You will be notified once a decision is made.',
  });
}
