import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { rateLimit } from '@/lib/kyc/rate-limit';
import { prisma } from '@/lib/db';
import { saveUpload } from '@/lib/uploads';

/** Upload Ghana Card / selfie / liveness frames for an existing KYC draft. */
export async function POST(request: Request) {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  if (!rateLimit(`kyc-upload:${user.id}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too many uploads. Try again shortly.' }, { status: 429 });
  }

  const form = await request.formData();
  const kycId = String(form.get('kycId') || '').trim();
  if (!kycId) {
    return NextResponse.json({ error: 'kycId is required.' }, { status: 400 });
  }

  const kyc = await prisma.kycVerification.findFirst({
    where: { id: kycId, userId: user.id, status: { in: ['draft', 'error'] } },
  });
  if (!kyc) {
    return NextResponse.json({ error: 'KYC session not found or already submitted.' }, { status: 404 });
  }

  const updates: {
    documentFrontUrl?: string;
    documentBackUrl?: string;
    selfieUrl?: string;
    livenessImageUrls?: string[];
  } = {};

  try {
    const documentFront = form.get('documentFront');
    const documentBack = form.get('documentBack');
    const selfie = form.get('selfie');
    const liveness = form.getAll('liveness');

    if (documentFront instanceof File && documentFront.size > 0) {
      updates.documentFrontUrl = await saveUpload(documentFront, 'kyc');
    }
    if (documentBack instanceof File && documentBack.size > 0) {
      updates.documentBackUrl = await saveUpload(documentBack, 'kyc');
    }
    if (selfie instanceof File && selfie.size > 0) {
      updates.selfieUrl = await saveUpload(selfie, 'kyc');
    }

    const liveUrls: string[] = [];
    for (const file of liveness) {
      if (file instanceof File && file.size > 0) {
        liveUrls.push(await saveUpload(file, 'kyc'));
      }
    }
    if (liveUrls.length) {
      updates.livenessImageUrls = [...(kyc.livenessImageUrls || []), ...liveUrls].slice(0, 8);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const updated = await prisma.kycVerification.update({
    where: { id: kyc.id },
    data: {
      ...updates,
      status: 'draft',
    },
  });

  return NextResponse.json({ kyc: updated });
}
