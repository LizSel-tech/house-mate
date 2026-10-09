import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { queryOne } from '@/lib/db';
import { contentTypeFor, resolveUploadFile } from '@/lib/uploads';
import type { SessionUser } from '@/types/auth';

const PUBLIC_FOLDERS = new Set(['avatars', 'covers']);

async function canAccess(folder: string, url: string, user: SessionUser): Promise<boolean> {
  const isAdmin = user.role === 'admin';

  if (folder === 'payments') {
    if (isAdmin) return true;
    const row = await queryOne(
      `SELECT 1 FROM signup_payments WHERE proof_url = $1 AND user_id = $2`,
      [url, user.id],
    );
    return Boolean(row);
  }

  if (folder === 'kyc') {
    if (isAdmin) return true;
    const row = await queryOne(
      `SELECT 1 FROM kyc_verifications
        WHERE user_id = $2
          AND ($1 IN (document_front_url, document_back_url, selfie_url)
               OR $1 = ANY (liveness_image_urls))`,
      [url, user.id],
    );
    return Boolean(row);
  }

  if (folder === 'verification') {
    if (isAdmin) return true;
    const row = await queryOne(
      `SELECT 1 FROM verification_documents d
         JOIN artisan_profiles a ON a.id = d.artisan_id
        WHERE a.user_id = $2
          AND ($1 IN (d.ghana_card_url, d.police_report_url, d.residence_proof_url)
               OR $1 = ANY (d.skills_evidence_urls))`,
      [url, user.id],
    );
    return Boolean(row);
  }

  if (folder === 'chat') {
    const row = await queryOne(
      `SELECT 1 FROM chat_messages m
         JOIN conversations c ON c.id = m.conversation_id
         JOIN artisan_profiles a ON a.id = c.artisan_id
         JOIN users cu ON cu.id = c.user_id
         JOIN users au ON au.id = a.user_id
        WHERE m.file_url = $1
          AND (c.user_id = $2
               OR a.user_id = $2
               OR ($3 AND cu.allow_admin_chat_review IS NOT FALSE
                       AND au.allow_admin_chat_review IS NOT FALSE))`,
      [url, user.id, isAdmin],
    );
    return Boolean(row);
  }

  return isAdmin;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await context.params;
  if (!segments?.length || segments.length < 2) {
    return new NextResponse('Not found', { status: 404 });
  }

  const folder = segments[0];
  const url = `/uploads/${segments.join('/')}`;
  const isPublic = PUBLIC_FOLDERS.has(folder);

  if (!isPublic) {
    const user = await getSession();
    if (!user) return new NextResponse('Unauthorized', { status: 401 });
    if (!(await canAccess(folder, url, user))) {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  const absolute = await resolveUploadFile(url);
  if (!absolute) return new NextResponse('Not found', { status: 404 });

  const body = await readFile(absolute);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': contentTypeFor(absolute),
      'Content-Length': String(body.length),
      'Cache-Control': isPublic
        ? 'public, max-age=31536000, immutable'
        : 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
