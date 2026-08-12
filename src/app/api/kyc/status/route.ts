import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const { user, error } = await requireSession(['artisan', 'admin']);
  if (error || !user) return error!;

  const { searchParams } = new URL(request.url);
  const kycId = searchParams.get('kycId');

  if (kycId) {
    const kyc = await prisma.kycVerification.findFirst({
      where:
        user.role === 'admin'
          ? { id: kycId }
          : { id: kycId, userId: user.id },
    });
    if (!kyc) {
      return NextResponse.json({ error: 'KYC record not found.' }, { status: 404 });
    }
    return NextResponse.json({ kyc });
  }

  const latest = await prisma.kycVerification.findFirst({
    where: user.role === 'admin' ? {} : { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ kyc: latest });
}
