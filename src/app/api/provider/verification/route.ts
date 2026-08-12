import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';
import { saveUpload } from '@/lib/uploads';

export async function GET() {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const profile = await prisma.artisanProfile.findUnique({
    where: { userId: user.id },
    include: {
      verificationDocuments: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  if (!profile) {
    return NextResponse.json({ error: 'Artisan profile not found.' }, { status: 404 });
  }

  return NextResponse.json({
    profile: {
      id: profile.id,
      trade: profile.trade,
      bio: profile.bio,
      serviceArea: profile.serviceArea,
      verificationStatus: profile.verificationStatus,
    },
    document: profile.verificationDocuments[0] ?? null,
  });
}

export async function POST(request: Request) {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const profile = await prisma.artisanProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    return NextResponse.json({ error: 'Artisan profile not found.' }, { status: 404 });
  }

  const form = await request.formData();
  const ghanaCardNumber = String(form.get('ghanaCardNumber') || '').trim();
  const guarantorName = String(form.get('guarantorName') || '').trim();
  const guarantorPhone = String(form.get('guarantorPhone') || '').trim();
  const trade = String(form.get('trade') || '').trim() || profile.trade;
  const bio = String(form.get('bio') || '').trim();
  const serviceArea = String(form.get('serviceArea') || '').trim();

  if (!ghanaCardNumber || !guarantorName || !guarantorPhone) {
    return NextResponse.json(
      { error: 'Ghana Card number and guarantor details are required.' },
      { status: 400 }
    );
  }

  const ghanaCard = form.get('ghanaCard');
  const policeReport = form.get('policeReport');
  const residenceProof = form.get('residenceProof');
  const skillsEvidence = form.getAll('skillsEvidence');

  let ghanaCardUrl: string | null = null;
  let policeReportUrl: string | null = null;
  let residenceProofUrl: string | null = null;
  const skillsEvidenceUrls: string[] = [];

  try {
    if (ghanaCard instanceof File && ghanaCard.size > 0) {
      ghanaCardUrl = await saveUpload(ghanaCard, 'verification');
    }
    if (policeReport instanceof File && policeReport.size > 0) {
      policeReportUrl = await saveUpload(policeReport, 'verification');
    }
    if (residenceProof instanceof File && residenceProof.size > 0) {
      residenceProofUrl = await saveUpload(residenceProof, 'verification');
    }
    for (const file of skillsEvidence) {
      if (file instanceof File && file.size > 0) {
        skillsEvidenceUrls.push(await saveUpload(file, 'verification'));
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!ghanaCardUrl) {
    return NextResponse.json({ error: 'Ghana Card photo/document is required.' }, { status: 400 });
  }

  const document = await prisma.verificationDocument.create({
    data: {
      artisanId: profile.id,
      ghanaCardUrl,
      ghanaCardNumber,
      policeReportUrl,
      residenceProofUrl,
      guarantorName,
      guarantorPhone,
      skillsEvidenceUrls,
      status: 'pending',
    },
  });

  await prisma.artisanProfile.update({
    where: { id: profile.id },
    data: {
      trade,
      bio: bio || null,
      serviceArea: serviceArea || null,
      verificationStatus: 'pending',
    },
  });

  return NextResponse.json({ document }, { status: 201 });
}
