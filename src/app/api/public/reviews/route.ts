import { NextResponse } from 'next/server';
import { queryData } from '@/lib/db';

export async function GET() {
  try {
    const reviews = await queryData<Record<string, unknown>>(
      `SELECT to_jsonb(r) || jsonb_build_object(
         'user', jsonb_build_object('name', u.name, 'location', u.location),
         'artisan', jsonb_build_object(
           'trade', a.trade,
           'user', jsonb_build_object('name', au.name)
         )
       ) AS data
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       JOIN artisan_profiles a ON a.id = r.artisan_id
       JOIN users au ON au.id = a.user_id
       WHERE r.comment IS NOT NULL AND btrim(r.comment) <> ''
       ORDER BY r.created_at DESC
       LIMIT 6`,
    );

    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        name: (r.user as { name: string }).name,
        location: (r.user as { location: string | null }).location,
        artisanName: (r.artisan as { user: { name: string } }).user.name,
        trade: (r.artisan as { trade: string }).trade,
        createdAt: r.createdAt,
      })),
    });
  } catch {
    return NextResponse.json({ reviews: [] });
  }
}
