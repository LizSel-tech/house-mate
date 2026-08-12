import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const body = (await request.json()) as { status?: 'approved' | 'rejected' };
  if (body.status !== 'approved' && body.status !== 'rejected') {
    return NextResponse.json({ error: 'Status must be approved or rejected.' }, { status: 400 });
  }

  const doc = await prisma.verificationDocument.findUnique({ where: { id } });
  if (!doc) {
    return NextResponse.json({ error: 'Verification not found.' }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const document = await tx.verificationDocument.update({
      where: { id },
      data: {
        status: body.status,
        reviewedById: user.id,
        reviewedAt: new Date(),
      },
    });

    await tx.artisanProfile.update({
      where: { id: doc.artisanId },
      data: { verificationStatus: body.status },
    });

    return document;
  });

  return NextResponse.json({ document: updated });
}
