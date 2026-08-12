import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { rateLimit } from '@/lib/kyc/rate-limit';
import { prisma } from '@/lib/db';

/** Create or resume a KYC draft session for the authenticated artisan. */
export async function POST(request: Request) {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  if (!rateLimit(`kyc-session:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again shortly.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    firstName?: string;
    lastName?: string;
    ghanaCardNumber?: string;
    trade?: string;
    serviceArea?: string;
    bio?: string;
    forceNew?: boolean;
  };

  const profile = await prisma.artisanProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return NextResponse.json({ error: 'Artisan profile not found.' }, { status: 404 });
  }

  if (body.trade || body.serviceArea || body.bio !== undefined) {
    await prisma.artisanProfile.update({
      where: { id: profile.id },
      data: {
        ...(body.trade ? { trade: body.trade.trim() } : {}),
        ...(body.serviceArea !== undefined ? { serviceArea: body.serviceArea.trim() || null } : {}),
        ...(body.bio !== undefined ? { bio: body.bio.trim() || null } : {}),
      },
    });
  }

  const nameParts = user.name.trim().split(/\s+/);
  const firstName = body.firstName?.trim() || nameParts[0] || 'Artisan';
  const lastName = body.lastName?.trim() || nameParts.slice(1).join(' ') || 'Provider';

  const forceNew = Boolean(body.forceNew);
  const existing = forceNew
    ? null
    : await prisma.kycVerification.findFirst({
        where: { userId: user.id, status: { in: ['draft', 'pending'] } },
        orderBy: { createdAt: 'desc' },
      });

  const kyc =
    existing ||
    (await prisma.kycVerification.create({
      data: {
        userId: user.id,
        artisanId: profile.id,
        status: 'draft',
        firstName,
        lastName,
        ghanaCardNumber: body.ghanaCardNumber?.trim() || null,
        consentGrantedAt: new Date(),
      },
    }));

  if (existing && (body.firstName || body.lastName || body.ghanaCardNumber)) {
    await prisma.kycVerification.update({
      where: { id: existing.id },
      data: {
        firstName,
        lastName,
        ghanaCardNumber: body.ghanaCardNumber?.trim() || existing.ghanaCardNumber,
        consentGrantedAt: existing.consentGrantedAt || new Date(),
      },
    });
  }

  return NextResponse.json({
    kyc: await prisma.kycVerification.findUnique({ where: { id: kyc.id } }),
  });
}

export async function GET() {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const profile = await prisma.artisanProfile.findUnique({ where: { userId: user.id } });
  const latest = await prisma.kycVerification.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    profile: profile
      ? {
          trade: profile.trade,
          bio: profile.bio,
          serviceArea: profile.serviceArea,
          verificationStatus: profile.verificationStatus,
        }
      : null,
    kyc: latest,
  });
}
