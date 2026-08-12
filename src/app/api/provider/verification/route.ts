import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryDataOne, queryOne } from '@/lib/db';
import { saveUpload } from '@/lib/uploads';
import type { ArtisanProfile, VerificationDocument } from '@/types/db';

export async function GET() {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const profile = await queryDataOne<
    ArtisanProfile & { verificationDocuments: VerificationDocument[] }
  >(
    `SELECT to_jsonb(a) || jsonb_build_object(
       'verification_documents', COALESCE((
         SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC)
         FROM (
           SELECT * FROM verification_documents
           WHERE artisan_id = a.id
           ORDER BY created_at DESC
           LIMIT 1
         ) d
       ), '[]'::jsonb)
     ) AS data
     FROM artisan_profiles a
     WHERE a.user_id = $1`,
    [user.id],
  );

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

  const profile = await queryOne<ArtisanProfile>(
    `SELECT * FROM artisan_profiles WHERE user_id = $1`,
    [user.id],
  );
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
      { status: 400 },
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

  const document = await queryOne<VerificationDocument>(
    `INSERT INTO verification_documents (
       artisan_id, ghana_card_url, ghana_card_number, police_report_url,
       residence_proof_url, guarantor_name, guarantor_phone, skills_evidence_urls, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
     RETURNING *`,
    [
      profile.id,
      ghanaCardUrl,
      ghanaCardNumber,
      policeReportUrl,
      residenceProofUrl,
      guarantorName,
      guarantorPhone,
      skillsEvidenceUrls,
    ],
  );

  await query(
    `UPDATE artisan_profiles
     SET trade = $1, bio = $2, service_area = $3, verification_status = 'pending'
     WHERE id = $4`,
    [trade, bio || null, serviceArea || null, profile.id],
  );

  return NextResponse.json({ document }, { status: 201 });
}
