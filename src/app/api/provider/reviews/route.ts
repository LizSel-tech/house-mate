import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryOne } from '@/lib/db';

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  clientName: string;
  clientAvatarUrl: string | null;
  clientRole: string;
  serviceTitle: string | null;
  bookingId: string;
};

export async function GET() {
  const { user, error } = await requireSession(['artisan']);
  if (error || !user) return error!;

  const profile = await queryOne<{ id: string; averageRating: string }>(
    `SELECT id, average_rating FROM artisan_profiles WHERE user_id = $1`,
    [user.id],
  );
  if (!profile) {
    return NextResponse.json({ reviews: [], summary: emptySummary() });
  }

  const reviews = await query<ReviewRow>(
    `SELECT r.id, r.rating, r.comment, r.created_at, r.booking_id,
            u.name AS client_name, u.avatar_url AS client_avatar_url, u.role AS client_role,
            s.title AS service_title
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       JOIN bookings b ON b.id = r.booking_id
       LEFT JOIN services s ON s.id = b.service_id
      WHERE r.artisan_id = $1
      ORDER BY r.created_at DESC
      LIMIT 500`,
    [profile.id],
  );

  const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of reviews) {
    const star = Math.min(5, Math.max(1, Number(r.rating))) as 1 | 2 | 3 | 4 | 5;
    breakdown[star] += 1;
  }

  return NextResponse.json({
    reviews: reviews.map((r) => ({ ...r, rating: Number(r.rating) })),
    summary: {
      averageRating: Number(profile.averageRating || 0),
      total: reviews.length,
      breakdown,
    },
  });
}

function emptySummary() {
  return { averageRating: 0, total: 0, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
}
