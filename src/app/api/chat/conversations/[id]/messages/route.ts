import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryOne } from '@/lib/db';
import { saveUpload } from '@/lib/uploads';
import type { ArtisanProfile } from '@/types/db';

type ConversationRow = {
  id: string;
  userId: string;
  artisanId: string;
};

async function canAccess(conversationId: string, userId: string, role: string) {
  const convo = await queryOne<ConversationRow>(
    `SELECT * FROM conversations WHERE id = $1`,
    [conversationId],
  );
  if (!convo) return null;
  if (role === 'admin') {
    const consent = await queryOne<{ ok: boolean }>(
      `SELECT (
         coalesce(u.allow_admin_chat_review, true)
         AND coalesce(au.allow_admin_chat_review, true)
       ) AS ok
       FROM conversations c
       JOIN users u ON u.id = c.user_id
       JOIN artisan_profiles a ON a.id = c.artisan_id
       JOIN users au ON au.id = a.user_id
       WHERE c.id = $1`,
      [conversationId],
    );
    return consent?.ok ? convo : null;
  }
  if (role === 'user' && convo.userId === userId) return convo;
  if (role === 'artisan') {
    const profile = await queryOne<ArtisanProfile>(
      `SELECT * FROM artisan_profiles WHERE user_id = $1`,
      [userId],
    );
    if (profile && profile.id === convo.artisanId) return convo;
  }
  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireSession(['user', 'artisan', 'admin']);
  if (error || !user) return error!;
  const { id } = await context.params;

  const convo = await canAccess(id, user.id, user.role);
  if (!convo) {
    return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  }

  const messages = await query(
    `SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 200`,
    [id],
  );
  return NextResponse.json({ messages });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireSession(['user', 'artisan']);
  if (error || !user) return error!;
  const { id } = await context.params;

  const convo = await canAccess(id, user.id, user.role);
  if (!convo) {
    return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 });
  }

  const form = await request.formData();
  const type = String(form.get('type') || 'text');
  const body = String(form.get('body') || '').trim();
  const file = form.get('file');

  if (!['text', 'file', 'audio'].includes(type)) {
    return NextResponse.json({ error: 'Invalid message type.' }, { status: 400 });
  }

  let fileUrl: string | null = null;
  if ((type === 'file' || type === 'audio') && file instanceof File && file.size > 0) {
    try {
      if (type === 'audio') {
        const mime = file.type.split(';')[0].trim().toLowerCase();
        const dirSafe = mime.startsWith('audio/') || mime === 'video/webm';
        if (!dirSafe) {
          return NextResponse.json({ error: 'Audio file required.' }, { status: 400 });
        }
        fileUrl = await saveUpload(file, 'chat', { audio: true });
      } else {
        fileUrl = await saveUpload(file, 'chat');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (type === 'text' && !body) {
    return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
  }
  if ((type === 'file' || type === 'audio') && !fileUrl) {
    return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
  }

  const message = await queryOne(
    `INSERT INTO chat_messages (conversation_id, sender_id, type, body, file_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, user.id, type, body || null, fileUrl],
  );

  await query(`UPDATE conversations SET updated_at = now() WHERE id = $1`, [id]);

  return NextResponse.json({ message }, { status: 201 });
}
