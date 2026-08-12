import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';

/** Admin approve/reject a KYC submission. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
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

  const kyc = await prisma.kycVerification.findUnique({ where: { id } });
  if (!kyc) {
    return NextResponse.json({ error: 'KYC record not found.' }, { status: 404 });
  }

  if (kyc.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending KYC submissions can be reviewed.' }, { status: 400 });
  }

  const kycStatus = body.status === 'approved' ? 'verified' : 'rejected';
  const artisanStatus = body.status === 'approved' ? 'approved' : 'rejected';

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.kycVerification.update({
      where: { id },
      data: {
        status: kycStatus,
        failureReason:
          body.status === 'rejected'
            ? body.reason?.trim() || 'Rejected by admin after document review.'
            : null,
        completedAt: new Date(),
        providerRawResult: {
          mode: 'manual',
          decidedBy: user.id,
          decision: body.status,
          reason: body.reason?.trim() || null,
        },
      },
    });

    if (kyc.artisanId) {
      await tx.artisanProfile.update({
        where: { id: kyc.artisanId },
        data: { verificationStatus: artisanStatus },
      });
    }

    return row;
  });

  return NextResponse.json({ kyc: updated });
}
