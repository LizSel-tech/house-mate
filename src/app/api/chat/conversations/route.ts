import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryData, queryOne } from '@/lib/db';
import type { ArtisanProfile } from '@/types/db';

const LIST_SQL = `
  SELECT to_jsonb(c) || jsonb_build_object(
    'user', jsonb_build_object(
      'id', u.id,
      'name', u.name,
      'avatar_url', u.avatar_url,
      'allow_admin_chat_review', u.allow_admin_chat_review
    ),
    'artisan', to_jsonb(a) || jsonb_build_object(
      'user', jsonb_build_object(
        'id', au.id,
        'name', au.name,
        'avatar_url', au.avatar_url,
        'allow_admin_chat_review', au.allow_admin_chat_review
      )
    ),
    'last_message', (
      SELECT to_jsonb(m)
      FROM chat_messages m
      WHERE m.conversation_id = c.id
      ORDER BY m.created_at DESC
      LIMIT 1
    )
  ) AS data
  FROM conversations c
  JOIN users u ON u.id = c.user_id
  JOIN artisan_profiles a ON a.id = c.artisan_id
  JOIN users au ON au.id = a.user_id
`;

export async function GET() {
  const { user, error } = await requireSession(['user', 'artisan', 'admin']);
  if (error || !user) return error!;

  if (user.role === 'admin') {
    const conversations = await queryData(
      `${LIST_SQL}
       WHERE coalesce(u.allow_admin_chat_review, true) = true
         AND coalesce(au.allow_admin_chat_review, true) = true
       ORDER BY c.updated_at DESC
       LIMIT 200`,
    );
    return NextResponse.json({ conversations });
  }

  if (user.role === 'user') {
    const conversations = await queryData(
      `${LIST_SQL} WHERE c.user_id = $1 ORDER BY c.updated_at DESC`,
      [user.id],
    );
    return NextResponse.json({ conversations });
  }

  const profile = await queryOne<ArtisanProfile>(
    `SELECT * FROM artisan_profiles WHERE user_id = $1`,
    [user.id],
  );
  if (!profile) {
    return NextResponse.json({ conversations: [] });
  }

  const conversations = await queryData(
    `${LIST_SQL} WHERE c.artisan_id = $1 ORDER BY c.updated_at DESC`,
    [profile.id],
  );
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const { user, error } = await requireSession(['user']);
  if (error || !user) return error!;

  const body = (await request.json()) as { artisanId?: string };
  if (!body.artisanId) {
    return NextResponse.json({ error: 'artisanId is required.' }, { status: 400 });
  }

  const artisan = await queryOne<ArtisanProfile>(
    `SELECT * FROM artisan_profiles WHERE id = $1 AND verification_status = 'approved'`,
    [body.artisanId],
  );
  if (!artisan) {
    return NextResponse.json({ error: 'Verified artisan not found.' }, { status: 404 });
  }

  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM conversations WHERE user_id = $1 AND artisan_id = $2`,
    [user.id, artisan.id],
  );
  if (existing) {
    return NextResponse.json({ conversationId: existing.id });
  }

  const created = await queryOne<{ id: string }>(
    `INSERT INTO conversations (user_id, artisan_id) VALUES ($1, $2) RETURNING id`,
    [user.id, artisan.id],
  );
  return NextResponse.json({ conversationId: created!.id }, { status: 201 });
}
