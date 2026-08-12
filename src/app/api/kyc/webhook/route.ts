import { NextResponse } from 'next/server';
import { mapSmileStatusToKyc, verifySmileWebhookSignature } from '@/lib/kyc/smile-identity';
import { query, queryOne, withTransaction } from '@/lib/db';
import type { KycVerification } from '@/types/db';

/**
 * Smile Identity webhook receiver.
 * Configure SMILE_ID_CALLBACK_URL to point here (must be HTTPS publicly).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get('x-smile-signature') ||
    request.headers.get('smileid-signature') ||
    request.headers.get('x-signature');
  const timestamp =
    request.headers.get('x-smile-timestamp') ||
    request.headers.get('smileid-timestamp') ||
    request.headers.get('x-timestamp');

  if (!verifySmileWebhookSignature(rawBody, signature, timestamp)) {
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
  }

  const partnerParams = (payload.partner_params || payload.PartnerParams || {}) as Record<
    string,
    string
  >;
  const jobId =
    (payload.job_id as string) ||
    (payload.JobId as string) ||
    partnerParams.job_id ||
    undefined;
  const partnerJobId = partnerParams.job_id;
  const smileStatus =
    (payload.status as string) ||
    ((payload.ResultCode as string) && String(payload.ResultCode)) ||
    undefined;

  const kyc =
    (partnerJobId &&
      (await queryOne<KycVerification>(`SELECT * FROM kyc_verifications WHERE id = $1`, [
        partnerJobId,
      ]))) ||
    (jobId &&
      (await queryOne<KycVerification>(
        `SELECT * FROM kyc_verifications WHERE id = $1 OR provider_job_id = $1 LIMIT 1`,
        [jobId],
      )));

  if (!kyc) {
    return NextResponse.json({ error: 'KYC job not found.' }, { status: 404 });
  }

  let mapped = mapSmileStatusToKyc(smileStatus);
  if (mapped === 'pending' && payload.ResultCode) {
    const code = String(payload.ResultCode);
    mapped = code.startsWith('08') ? 'verified' : 'rejected';
  }

  const reason =
    (payload.reason as string) ||
    (payload.message as string) ||
    (payload.ResultText as string) ||
    null;

  const extracted =
    (payload.id_fields as object) ||
    (payload.FullData as object) ||
    (payload.PartnerParams as object) ||
    null;

  const status = mapped === 'pending' ? 'pending' : mapped;

  await withTransaction(async (tx) => {
    await query(
      `UPDATE kyc_verifications
       SET status = $1,
           failure_reason = $2,
           extracted_fields = COALESCE($3::jsonb, extracted_fields),
           provider_raw_result = $4::jsonb,
           provider_job_id = COALESCE($5, provider_job_id),
           completed_at = $6
       WHERE id = $7`,
      [
        status,
        mapped === 'verified' ? null : reason,
        extracted ? JSON.stringify(extracted) : null,
        JSON.stringify(payload),
        jobId || kyc.providerJobId,
        mapped === 'pending' ? null : new Date(),
        kyc.id,
      ],
      tx,
    );

    if (kyc.artisanId) {
      if (mapped === 'verified') {
        await query(
          `UPDATE artisan_profiles SET verification_status = 'approved' WHERE id = $1`,
          [kyc.artisanId],
          tx,
        );
      } else if (mapped === 'rejected' || mapped === 'error') {
        await query(
          `UPDATE artisan_profiles SET verification_status = 'rejected' WHERE id = $1`,
          [kyc.artisanId],
          tx,
        );
      }
    }
  });

  return NextResponse.json({ ok: true });
}
