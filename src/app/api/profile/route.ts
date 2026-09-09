import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { queryOne } from '@/lib/db';
import type { User } from '@/types/db';

function serializeUser(row: User) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    location: row.location,
    accountStatus: row.accountStatus,
    avatarUrl: row.avatarUrl,
    coverUrl: row.coverUrl ?? null,
    allowAdminChatReview: row.allowAdminChatReview !== false,
    createdAt: row.createdAt,
  };
}

export async function GET() {
  const { user, error } = await requireSession();
  if (error || !user) return error!;

  const row = await queryOne<User>(`SELECT * FROM users WHERE id = $1`, [user.id]);
  if (!row) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  return NextResponse.json({ user: serializeUser(row) });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireSession();
  if (error || !user) return error!;

  const body = (await request.json()) as {
    name?: string;
    email?: string | null;
    location?: string | null;
    allowAdminChatReview?: boolean;
  };

  const current = await queryOne<User>(`SELECT * FROM users WHERE id = $1`, [user.id]);
  if (!current) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const name = body.name !== undefined ? body.name.trim() : current.name;
  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  }

  const emailRaw =
    body.email !== undefined ? body.email?.trim() || null : current.email;
  if (emailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const location =
    body.location !== undefined ? body.location?.trim() || null : current.location;

  const allowAdminChatReview =
    body.allowAdminChatReview !== undefined
      ? Boolean(body.allowAdminChatReview)
      : current.allowAdminChatReview !== false;

  const updated = await queryOne<User>(
    `UPDATE users
     SET name = $1,
         email = $2,
         location = $3,
         allow_admin_chat_review = $4
     WHERE id = $5
     RETURNING *`,
    [name, emailRaw, location, allowAdminChatReview, user.id],
  );

  if (!updated) {
    return NextResponse.json({ error: 'Unable to update profile.' }, { status: 500 });
  }

  return NextResponse.json({ user: serializeUser(updated) });
}
