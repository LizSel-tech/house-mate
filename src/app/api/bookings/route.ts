import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { queryData, queryOne } from '@/lib/db';
import { BOOKING_DATA_SQL } from '@/lib/db/bookings';
import type { ArtisanProfile, Service } from '@/types/db';

export async function GET() {
  const { user, error } = await requireSession(['user', 'artisan', 'admin']);
  if (error || !user) return error!;

  if (user.role === 'user') {
    const bookings = await queryData(
      `${BOOKING_DATA_SQL} WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
      [user.id],
    );
    return NextResponse.json({ bookings });
  }

  if (user.role === 'artisan') {
    const profile = await queryOne<ArtisanProfile>(
      `SELECT * FROM artisan_profiles WHERE user_id = $1`,
      [user.id],
    );
    if (!profile) {
      return NextResponse.json({ error: 'Artisan profile not found.' }, { status: 404 });
    }
    const bookings = await queryData(
      `${BOOKING_DATA_SQL} WHERE b.artisan_id = $1 ORDER BY b.created_at DESC`,
      [profile.id],
    );
    return NextResponse.json({ bookings });
  }

  const bookings = await queryData(
    `${BOOKING_DATA_SQL} ORDER BY b.created_at DESC LIMIT 100`,
  );
  return NextResponse.json({ bookings });
}

export async function POST(request: Request) {
  const { user, error } = await requireSession(['user']);
  if (error || !user) return error!;

  const body = (await request.json()) as {
    artisanId?: string;
    serviceId?: string;
    location?: string;
    problemDescription?: string;
    agreedPrice?: number | string;
  };

  if (!body.artisanId || !body.serviceId) {
    return NextResponse.json({ error: 'Artisan and service are required.' }, { status: 400 });
  }

  const artisan = await queryOne<ArtisanProfile>(
    `SELECT * FROM artisan_profiles WHERE id = $1 AND verification_status = 'approved'`,
    [body.artisanId],
  );
  if (!artisan) {
    return NextResponse.json({ error: 'Verified artisan not found.' }, { status: 404 });
  }

  const service = await queryOne<Service>(
    `SELECT * FROM services WHERE id = $1 AND artisan_id = $2 AND is_active = true`,
    [body.serviceId, artisan.id],
  );
  if (!service) {
    return NextResponse.json({ error: 'Service not found.' }, { status: 404 });
  }

  const agreedPrice =
    body.agreedPrice !== undefined && body.agreedPrice !== ''
      ? Number(body.agreedPrice)
      : Number(service.priceAmount);

  if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
    return NextResponse.json({ error: 'Enter a valid agreed price.' }, { status: 400 });
  }

  const created = await queryOne<{ id: string }>(
    `INSERT INTO bookings (user_id, artisan_id, service_id, location, problem_description, agreed_price, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'requested')
     RETURNING id`,
    [
      user.id,
      artisan.id,
      service.id,
      body.location?.trim() || null,
      body.problemDescription?.trim() || null,
      agreedPrice,
    ],
  );

  const booking = await queryData(
    `${BOOKING_DATA_SQL} WHERE b.id = $1`,
    [created!.id],
  );

  return NextResponse.json({ booking: booking[0] }, { status: 201 });
}
