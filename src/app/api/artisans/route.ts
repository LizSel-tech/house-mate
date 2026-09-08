import { NextResponse } from 'next/server';
import { queryData } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() || '';
  const trade = searchParams.get('trade')?.trim() || '';
  const area = searchParams.get('area')?.trim() || '';

  const filters: string[] = [
    `a.verification_status = 'approved'`,
    `EXISTS (SELECT 1 FROM services s0 WHERE s0.artisan_id = a.id AND s0.is_active = true)`,
  ];
  const params: unknown[] = [];

  if (trade) {
    params.push(`%${trade}%`);
    filters.push(`a.trade ILIKE $${params.length}`);
  }
  if (area) {
    params.push(`%${area}%`);
    filters.push(`a.service_area ILIKE $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    const i = params.length;
    filters.push(`(
      a.trade ILIKE $${i}
      OR a.bio ILIKE $${i}
      OR a.service_area ILIKE $${i}
      OR u.name ILIKE $${i}
      OR EXISTS (
        SELECT 1 FROM services sq
        WHERE sq.artisan_id = a.id AND sq.is_active = true AND sq.title ILIKE $${i}
      )
    )`);
  }

  const artisans = await queryData<Record<string, unknown>>(
    `SELECT to_jsonb(a) || jsonb_build_object(
       'user', jsonb_build_object(
         'id', u.id,
         'name', u.name,
         'phone', u.phone,
         'location', u.location,
         'avatar_url', u.avatar_url
       ),
       'services', COALESCE((
         SELECT jsonb_agg(to_jsonb(s) ORDER BY s.price_amount ASC)
         FROM services s
         WHERE s.artisan_id = a.id AND s.is_active = true
       ), '[]'::jsonb)
     ) AS data
     FROM artisan_profiles a
     JOIN users u ON u.id = a.user_id
     WHERE ${filters.join(' AND ')}
     ORDER BY a.average_rating DESC, a.jobs_completed DESC
     LIMIT 48`,
    params,
  );

  return NextResponse.json({
    artisans: artisans.map((a: Record<string, unknown>) => ({
      id: a.id,
      trade: a.trade,
      bio: a.bio,
      serviceArea: a.serviceArea,
      averageRating: Number(a.averageRating),
      jobsCompleted: a.jobsCompleted,
      user: {
        ...(a.user as Record<string, unknown>),
        avatarUrl: (a.user as { avatarUrl?: string | null })?.avatarUrl ?? null,
      },
      services: ((a.services as Record<string, unknown>[]) || []).map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        priceAmount: Number(s.priceAmount),
        priceUnit: s.priceUnit,
      })),
    })),
  });
}
