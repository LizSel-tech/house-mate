import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import { query, queryDataOne } from '@/lib/db';
import { BOOKING_DATA_SQL } from '@/lib/db/bookings';
import { getBookingParties, notifyUser } from '@/lib/notify';
import type { ArtisanProfile, Booking, BookingStatus, Payment } from '@/types/db';

const ARTISAN_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  requested: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['completed'],
};

const USER_TRANSITIONS: Partial<Record<BookingStatus, BookingStatus[]>> = {
  requested: ['cancelled'],
  completed: ['completed'],
};

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await requireSession(['user', 'artisan', 'admin']);
  if (error || !user) return error!;

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: BookingStatus;
    agreedPrice?: number | string;
  };

  const booking = await queryDataOne<
    Booking & { artisan: ArtisanProfile; payment: Payment | null }
  >(
    `SELECT to_jsonb(b) || jsonb_build_object(
       'artisan', to_jsonb(a),
       'payment', to_jsonb(p)
     ) AS data
     FROM bookings b
     JOIN artisan_profiles a ON a.id = b.artisan_id
     LEFT JOIN payments p ON p.booking_id = b.id
     WHERE b.id = $1`,
    [id],
  );
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found.' }, { status: 404 });
  }

  const isOwnerArtisan = user.role === 'artisan' && booking.artisan.userId === user.id;
  const isOwnerUser = !isOwnerArtisan && user.role !== 'admin' && booking.userId === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwnerUser && !isOwnerArtisan && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
  }

  if (body.agreedPrice !== undefined && (isOwnerArtisan || isAdmin)) {
    const agreedPrice = Number(body.agreedPrice);
    if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
      return NextResponse.json({ error: 'Invalid price.' }, { status: 400 });
    }
    await query(`UPDATE bookings SET agreed_price = $1 WHERE id = $2`, [agreedPrice, id]);
    const updated = await queryDataOne(`${BOOKING_DATA_SQL} WHERE b.id = $1`, [id]);
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
      { status: 400 },
    );
  }

  await query(`UPDATE bookings SET status = $1 WHERE id = $2`, [body.status, id]);
  const updated = await queryDataOne(`${BOOKING_DATA_SQL} WHERE b.id = $1`, [id]);

  if (body.status !== booking.status) {
    await notifyStatusChange(
      id,
      booking.status,
      body.status,
      isAdmin ? 'admin' : isOwnerArtisan ? 'artisan' : 'user',
    );
  }

  return NextResponse.json({ booking: updated });
}

async function notifyStatusChange(
  bookingId: string,
  from: BookingStatus,
  to: BookingStatus,
  actor: 'admin' | 'artisan' | 'user',
) {
  const parties = await getBookingParties(bookingId);
  if (!parties) return;
  const job = `"${parties.title}"`;

  if (to === 'accepted') {
    await notifyUser(parties.customerId, {
      type: 'booking_accepted',
      title: 'Booking accepted',
      body: `${parties.artisanName} accepted ${job}. Pay into escrow so work can start.`,
      href: parties.customerBookingsHref,
    });
  } else if (to === 'completed') {
    await notifyUser(parties.customerId, {
      type: 'booking_work_done',
      title: 'Work marked done',
      body: `${parties.artisanName} marked ${job} as done. Confirm completion to release payment.`,
      href: parties.customerBookingsHref,
    });
  } else if (to === 'cancelled') {
    if (actor === 'artisan') {
      await notifyUser(parties.customerId, {
        type: 'booking_declined',
        title: from === 'requested' ? 'Booking declined' : 'Booking cancelled',
        body: `${parties.artisanName} ${from === 'requested' ? 'declined' : 'cancelled'} ${job}.`,
        href: parties.customerBookingsHref,
      });
    } else if (actor === 'user') {
      await notifyUser(parties.artisanUserId, {
        type: 'booking_cancelled',
        title: 'Booking cancelled',
        body: `${parties.customerName} cancelled ${job}.`,
        href: '/provider/jobs',
      });
    } else {
      for (const [userId, href] of [
        [parties.customerId, parties.customerBookingsHref],
        [parties.artisanUserId, '/provider/jobs'],
      ] as const) {
        await notifyUser(userId, {
          type: 'booking_cancelled',
          title: 'Booking cancelled',
          body: `Craftviva cancelled ${job}.`,
          href,
        });
      }
    }
  }
}
