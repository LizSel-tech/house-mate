import { NextResponse } from 'next/server';
import { queryDataOne } from '@/lib/db';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const artisan = await queryDataOne<Record<string, unknown>>(
    `SELECT to_jsonb(a) || jsonb_build_object(
       'user', jsonb_build_object('id', u.id, 'name', u.name, 'phone', u.phone, 'location', u.location),
       'services', COALESCE((
         SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_at DESC)
         FROM services s
         WHERE s.artisan_id = a.id AND s.is_active = true
       ), '[]'::jsonb),
       'reviews', COALESCE((
         SELECT jsonb_agg(row_data ORDER BY (row_data->>'created_at') DESC)
         FROM (
           SELECT to_jsonb(r) || jsonb_build_object('user', jsonb_build_object('name', ru.name)) AS row_data
           FROM reviews r
           JOIN users ru ON ru.id = r.user_id
           WHERE r.artisan_id = a.id
           ORDER BY r.created_at DESC
           LIMIT 10
         ) review_rows
       ), '[]'::jsonb)
     ) AS data
     FROM artisan_profiles a
     JOIN users u ON u.id = a.user_id
     WHERE a.id = $1 AND a.verification_status = 'approved'`,
    [id],
  );

  if (!artisan) {
    return NextResponse.json({ error: 'Artisan not found or not verified.' }, { status: 404 });
  }

  const services = (artisan.services as Record<string, unknown>[]) || [];
  const reviews = (artisan.reviews as Record<string, unknown>[]) || [];

  return NextResponse.json({
    artisan: {
      id: artisan.id,
      trade: artisan.trade,
      bio: artisan.bio,
      serviceArea: artisan.serviceArea,
      averageRating: Number(artisan.averageRating),
      jobsCompleted: artisan.jobsCompleted,
      user: artisan.user,
      services: services.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        priceAmount: Number(s.priceAmount),
        priceUnit: s.priceUnit,
      })),
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        userName: (r.user as { name: string }).name,
        createdAt: r.createdAt,
      })),
    },
  });
}
