import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';

export async function GET() {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const [pendingDocs, kycRecords] = await Promise.all([
    prisma.verificationDocument.findMany({
      where: { status: 'pending' },
      include: {
        artisan: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.kycVerification.findMany({
      where: { status: { in: ['pending', 'verified', 'rejected', 'error'] } },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        artisan: {
          select: {
            id: true,
            trade: true,
            serviceArea: true,
            verificationStatus: true,
          },
        },
      },
      orderBy: [{ submittedAt: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    }),
  ]);

  // Pending KYC first so admins see the review queue at the top.
  const kyc = [...kycRecords].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    return 0;
  });

  return NextResponse.json({
    verifications: pendingDocs,
    kyc,
  });
}
