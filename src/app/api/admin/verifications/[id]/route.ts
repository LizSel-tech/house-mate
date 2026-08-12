import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryOne, withTransaction } from '@/lib/db';
import type { VerificationDocument } from '@/types/db';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const body = (await request.json()) as { status?: 'approved' | 'rejected' };
  if (body.status !== 'approved' && body.status !== 'rejected') {
    return NextResponse.json({ error: 'Status must be approved or rejected.' }, { status: 400 });
  }

  const doc = await queryOne<VerificationDocument>(
    `SELECT * FROM verification_documents WHERE id = $1`,
    [id],
  );
  if (!doc) {
    return NextResponse.json({ error: 'Verification not found.' }, { status: 404 });
  }

  const updated = await withTransaction(async (tx) => {
    const document = await queryOne<VerificationDocument>(
      `UPDATE verification_documents
       SET status = $1, reviewed_by = $2, reviewed_at = now()
       WHERE id = $3
       RETURNING *`,
      [body.status, user.id, id],
      tx,
    );

    await query(
      `UPDATE artisan_profiles SET verification_status = $1 WHERE id = $2`,
      [body.status, doc.artisanId],
      tx,
    );

    return document;
  });

  return NextResponse.json({ document: updated });
}
