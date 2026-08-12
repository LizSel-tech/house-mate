import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryOne } from '@/lib/db';
import type { ArtisanProfile, Service } from '@/types/db';

async function getArtisanId(userId: string) {
  const profile = await queryOne<ArtisanProfile>(
    `SELECT * FROM artisan_profiles WHERE user_id = $1`,
    [userId],
  );
  return profile?.id ?? null;
}

export async function GET() {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const artisanId = await getArtisanId(user.id);
  if (!artisanId) {
    return NextResponse.json({ error: 'Artisan profile not found.' }, { status: 404 });
  }

  const services = await query<Service>(
    `SELECT * FROM services WHERE artisan_id = $1 ORDER BY created_at DESC`,
    [artisanId],
  );

  return NextResponse.json({ services });
}

export async function POST(request: Request) {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const artisanId = await getArtisanId(user.id);
  if (!artisanId) {
    return NextResponse.json({ error: 'Artisan profile not found.' }, { status: 404 });
  }

  const body = (await request.json()) as {
    title?: string;
    description?: string;
    priceAmount?: number | string;
    priceUnit?: string;
  };

  const title = body.title?.trim();
  const priceAmount = Number(body.priceAmount);

  if (!title) {
    return NextResponse.json({ error: 'Service title is required.' }, { status: 400 });
  }
  if (!Number.isFinite(priceAmount) || priceAmount <= 0) {
    return NextResponse.json({ error: 'Enter a valid price.' }, { status: 400 });
  }

  const service = await queryOne<Service>(
    `INSERT INTO services (artisan_id, title, description, price_amount, price_unit)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [artisanId, title, body.description?.trim() || null, priceAmount, body.priceUnit?.trim() || 'job'],
  );

  return NextResponse.json({ service }, { status: 201 });
}
