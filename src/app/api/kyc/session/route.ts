import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { rateLimit } from '@/lib/kyc/rate-limit';
import { buildUpdates, query, queryOne } from '@/lib/db';
import type { ArtisanProfile, KycVerification } from '@/types/db';

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

  const profile = await queryOne<ArtisanProfile>(
    `SELECT * FROM artisan_profiles WHERE user_id = $1`,
    [user.id],
  );
  if (!profile) {
    return NextResponse.json({ error: 'Artisan profile not found.' }, { status: 404 });
  }

  if (body.trade || body.serviceArea || body.bio !== undefined) {
    const { sets, values } = buildUpdates({
      trade: body.trade ? body.trade.trim() : undefined,
      service_area: body.serviceArea !== undefined ? body.serviceArea.trim() || null : undefined,
      bio: body.bio !== undefined ? body.bio.trim() || null : undefined,
    });
    if (sets.length) {
      values.push(profile.id);
      await query(
        `UPDATE artisan_profiles SET ${sets.join(', ')} WHERE id = $${values.length}`,
        values,
      );
    }
  }

  const nameParts = user.name.trim().split(/\s+/);
  const firstName = body.firstName?.trim() || nameParts[0] || 'Artisan';
  const lastName = body.lastName?.trim() || nameParts.slice(1).join(' ') || 'Provider';

  const forceNew = Boolean(body.forceNew);
  const existing = forceNew
    ? null
    : await queryOne<KycVerification>(
        `SELECT * FROM kyc_verifications
         WHERE user_id = $1 AND status IN ('draft', 'pending')
         ORDER BY created_at DESC
         LIMIT 1`,
        [user.id],
      );

  const kyc =
    existing ||
    (await queryOne<KycVerification>(
      `INSERT INTO kyc_verifications
        (user_id, artisan_id, status, first_name, last_name, ghana_card_number, consent_granted_at)
       VALUES ($1, $2, 'draft', $3, $4, $5, now())
       RETURNING *`,
      [user.id, profile.id, firstName, lastName, body.ghanaCardNumber?.trim() || null],
    ))!;

  if (existing && (body.firstName || body.lastName || body.ghanaCardNumber)) {
    await query(
      `UPDATE kyc_verifications
       SET first_name = $1,
           last_name = $2,
           ghana_card_number = $3,
           consent_granted_at = COALESCE(consent_granted_at, now())
       WHERE id = $4`,
      [
        firstName,
        lastName,
        body.ghanaCardNumber?.trim() || existing.ghanaCardNumber,
        existing.id,
      ],
    );
  }

  return NextResponse.json({
    kyc: await queryOne<KycVerification>(`SELECT * FROM kyc_verifications WHERE id = $1`, [kyc.id]),
  });
}

export async function GET() {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const profile = await queryOne<ArtisanProfile>(
    `SELECT * FROM artisan_profiles WHERE user_id = $1`,
    [user.id],
  );
  const latest = await queryOne<KycVerification>(
    `SELECT * FROM kyc_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [user.id],
  );

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
