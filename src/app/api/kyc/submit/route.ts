import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { rateLimit } from '@/lib/kyc/rate-limit';
import { prisma } from '@/lib/db';

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

  const kyc = await prisma.kycVerification.findFirst({
    where: { id: body.kycId, userId: user.id, status: { in: ['draft', 'error'] } },
  });
  if (!kyc) {
    return NextResponse.json({ error: 'KYC session not found.' }, { status: 404 });
  }

  if (!kyc.documentFrontUrl || !kyc.selfieUrl || (kyc.livenessImageUrls?.length || 0) < 6) {
    return NextResponse.json(
      {
        error:
          'Upload Ghana Card front, a selfie, and at least 6 guided liveness frames before submitting.',
      },
      { status: 400 }
    );
  }

  if (!kyc.firstName || !kyc.lastName) {
    return NextResponse.json({ error: 'First and last name are required.' }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.kycVerification.update({
      where: { id: kyc.id },
      data: {
        status: 'pending',
        provider: 'manual',
        submittedAt: new Date(),
        completedAt: null,
        failureReason: null,
        providerRawResult: {
          mode: 'manual',
          message: 'Awaiting admin review of Ghana Card, selfie, and liveness frames.',
        },
        extractedFields: {
          full_name: `${kyc.firstName} ${kyc.lastName}`,
          id_number: kyc.ghanaCardNumber,
          country: 'GH',
          id_type: 'NATIONAL_ID',
        },
      },
    });

    if (kyc.artisanId) {
      await tx.artisanProfile.update({
        where: { id: kyc.artisanId },
        data: { verificationStatus: 'pending' },
      });
    }

    return row;
  });

  return NextResponse.json({
    kyc: updated,
    mode: 'manual',
    message: 'Submitted for admin review. You will be notified once a decision is made.',
  });
}
