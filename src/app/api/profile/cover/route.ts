import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { queryOne } from '@/lib/db';
import { deleteUpload, saveUpload } from '@/lib/uploads';
import type { User } from '@/types/db';

async function loadUser(id: string) {
  return queryOne<User>(`SELECT * FROM users WHERE id = $1`, [id]);
}

export async function POST(request: Request) {
  const { user, error } = await requireSession(['user', 'artisan', 'admin']);
  if (error || !user) return error!;

  const form = await request.formData();
  const file = form.get('cover');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 });
  }

  const current = await loadUser(user.id);
  if (!current) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  let coverUrl: string;
  try {
    coverUrl = await saveUpload(file, 'covers', { imagesOnly: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const updated = await queryOne<User>(
    `UPDATE users SET cover_url = $1 WHERE id = $2 RETURNING *`,
    [coverUrl, user.id],
  );
  if (!updated) {
    await deleteUpload(coverUrl);
    return NextResponse.json({ error: 'Unable to save cover image.' }, { status: 500 });
  }

  await deleteUpload(current.coverUrl);
  return NextResponse.json({ coverUrl: updated.coverUrl });
}

export async function DELETE() {
  const { user, error } = await requireSession(['user', 'artisan', 'admin']);
  if (error || !user) return error!;

  const current = await loadUser(user.id);
  if (!current) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  const updated = await queryOne<User>(
    `UPDATE users SET cover_url = NULL WHERE id = $1 RETURNING *`,
    [user.id],
  );
  if (!updated) {
    return NextResponse.json({ error: 'Unable to remove cover image.' }, { status: 500 });
  }

  await deleteUpload(current.coverUrl);
  return NextResponse.json({ coverUrl: null });
}
