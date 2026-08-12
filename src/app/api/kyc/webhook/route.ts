import { NextResponse } from 'next/server';
import { mapSmileStatusToKyc, verifySmileWebhookSignature } from '@/lib/kyc/smile-identity';
import { prisma } from '@/lib/db';

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

  // Prefer partner job id (our kyc id) then provider job id
  const kyc =
    (partnerJobId &&
      (await prisma.kycVerification.findUnique({ where: { id: partnerJobId } }))) ||
    (jobId &&
      (await prisma.kycVerification.findFirst({
        where: { OR: [{ id: jobId }, { providerJobId: jobId }] },
      })));

  if (!kyc) {
    return NextResponse.json({ error: 'KYC job not found.' }, { status: 404 });
  }

  // Classic ResultCode mapping fallback
  let mapped = mapSmileStatusToKyc(smileStatus);
  if (mapped === 'pending' && payload.ResultCode) {
    const code = String(payload.ResultCode);
    // Smile classic success codes often start with 0810 / 0820 family; treat 08xx approved patterns loosely
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

  await prisma.$transaction(async (tx) => {
    await tx.kycVerification.update({
      where: { id: kyc.id },
      data: {
        status: mapped === 'pending' ? 'pending' : mapped,
        failureReason: mapped === 'verified' ? null : reason,
        extractedFields: extracted || undefined,
        providerRawResult: payload,
        providerJobId: jobId || kyc.providerJobId,
        completedAt: mapped === 'pending' ? null : new Date(),
      },
    });

    if (kyc.artisanId) {
      if (mapped === 'verified') {
        await tx.artisanProfile.update({
          where: { id: kyc.artisanId },
          data: { verificationStatus: 'approved' },
        });
      } else if (mapped === 'rejected' || mapped === 'error') {
        await tx.artisanProfile.update({
          where: { id: kyc.artisanId },
          data: { verificationStatus: 'rejected' },
        });
      }
    }
  });

  return NextResponse.json({ ok: true });
}
