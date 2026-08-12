import { NextResponse } from 'next/server';
import { BookingStatus } from '@prisma/client';
import { requireSession } from '@/lib/auth/require-session';
import { prisma } from '@/lib/db';

const ARTISAN_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  requested: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
};

const USER_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  requested: ['cancelled'],
  completed: ['completed'], // confirm handled via payment release
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireSession(['user', 'artisan', 'admin']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: BookingStatus;
    agreedPrice?: number | string;
  };

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { artisan: true, payment: true },
  });
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  const isOwnerUser = user.role === 'user' && booking.userId === user.id;
  const isOwnerArtisan = user.role === 'artisan' && booking.artisan.userId === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwnerUser && !isOwnerArtisan && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  if (body.agreedPrice !== undefined && (isOwnerArtisan || isAdmin)) {
    const agreedPrice = Number(body.agreedPrice);
    if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
      return NextResponse.json({ error: 'Invalid price.' }, { status: 400 });
    }
    const updated = await prisma.booking.update({
      where: { id },
      data: { agreedPrice },
    });
    return NextResponse.json({ booking: updated });
  }

  if (!body.status) {
    return NextResponse.json({ error: 'Status is required.' }, { status: 400 });
  }

  const allowed = isAdmin
    ? true
    : isOwnerArtisan
      ? (ARTISAN_TRANSITIONS[booking.status] || []).includes(body.status)
      : (USER_TRANSITIONS[booking.status] || []).includes(body.status);

  if (!allowed) {
    return NextResponse.json(
      { error: `Cannot change status from ${booking.status} to ${body.status}.` },
      { status: 400 }
    );
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: body.status },
    include: { payment: true, service: true },
  });

  return NextResponse.json({ booking: updated });
}
