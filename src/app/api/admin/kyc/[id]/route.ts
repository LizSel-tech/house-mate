import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryOne, withTransaction } from '@/lib/db';
import type { KycVerification } from '@/types/db';

/** Admin approve/reject a KYC submission. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: 'approved' | 'rejected';
    reason?: string;
  };

  if (body.status !== 'approved' && body.status !== 'rejected') {
    return NextResponse.json({ error: 'Status must be approved or rejected.' }, { status: 400 });
  }

  const kyc = await queryOne<KycVerification>(`SELECT * FROM kyc_verifications WHERE id = $1`, [id]);
  if (!kyc) {
    return NextResponse.json({ error: 'KYC record not found.' }, { status: 404 });
  }

  if (kyc.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending KYC submissions can be reviewed.' }, { status: 400 });
  }

  const kycStatus = body.status === 'approved' ? 'verified' : 'rejected';
  const artisanStatus = body.status === 'approved' ? 'approved' : 'rejected';

  const updated = await withTransaction(async (tx) => {
    const row = await queryOne<KycVerification>(
      `UPDATE kyc_verifications
       SET status = $1,
           failure_reason = $2,
           completed_at = now(),
           provider_raw_result = $3::jsonb
       WHERE id = $4
       RETURNING *`,
      [
        kycStatus,
        body.status === 'rejected'
          ? body.reason?.trim() || 'Rejected by admin after document review.'
          : null,
        JSON.stringify({
          mode: 'manual',
          decidedBy: user.id,
          decision: body.status,
          reason: body.reason?.trim() || null,
        }),
        id,
      ],
      tx,
    );

    if (kyc.artisanId) {
      await query(
        `UPDATE artisan_profiles SET verification_status = $1 WHERE id = $2`,
        [artisanStatus, kyc.artisanId],
        tx,
      );
    }

    return row;
  });

  return NextResponse.json({ kyc: updated });
}
