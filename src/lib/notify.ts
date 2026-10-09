import { query, queryOne } from '@/lib/db';

export type UserNotificationInput = {
  type: string;
  title: string;
  body: string;
  href?: string;
};

/**
 * Notifications are a side effect: a failure here must never break the action that
 * triggered it (booking, payment, review, …), so errors are logged and swallowed.
 */
export async function notifyUser(
  userId: string | null | undefined,
  input: UserNotificationInput,
  options?: { skipIfUnread?: boolean },
) {
  if (!userId) return;
  try {
    if (options?.skipIfUnread) {
      const existing = await queryOne(
        `SELECT 1 FROM notifications
          WHERE user_id = $1 AND type = $2 AND href IS NOT DISTINCT FROM $3 AND read_at IS NULL
          LIMIT 1`,
        [userId, input.type, input.href || null],
      );
      if (existing) return;
    }
    await query(
      `INSERT INTO notifications (user_id, type, title, body, href)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, input.type, input.title, input.body, input.href || null],
    );
  } catch (err) {
    console.error('notifyUser failed', err);
  }
}

export function kycDecisionNotification(
  decision: 'approved' | 'rejected',
  reason?: string | null,
): UserNotificationInput {
  return decision === 'approved'
    ? {
        type: 'verification_approved',
        title: 'Verification approved',
        body: 'Your identity is verified. Customers can now find and book you.',
        href: '/provider/verification',
      }
    : {
        type: 'verification_rejected',
        title: 'Verification rejected',
        body: `${reason || 'Your verification was not approved.'} You can resubmit from the Verification page.`,
        href: '/provider/verification',
      };
}

export type BookingParties = {
  title: string;
  customerId: string;
  customerName: string;
  artisanUserId: string;
  artisanName: string;
};

export async function getBookingParties(bookingId: string): Promise<BookingParties | null> {
  try {
    return await queryOne<BookingParties>(
      `SELECT COALESCE(s.title, 'Custom job') AS title,
              cu.id   AS customer_id,
              cu.name AS customer_name,
              au.id   AS artisan_user_id,
              au.name AS artisan_name
         FROM bookings b
         JOIN users cu ON cu.id = b.user_id
         JOIN artisan_profiles a ON a.id = b.artisan_id
         JOIN users au ON au.id = a.user_id
         LEFT JOIN services s ON s.id = b.service_id
        WHERE b.id = $1`,
      [bookingId],
    );
  } catch (err) {
    console.error('getBookingParties failed', err);
    return null;
  }
}

export async function notifyArtisan(artisanId: string | null | undefined, input: UserNotificationInput) {
  if (!artisanId) return;
  try {
    const row = await queryOne<{ userId: string }>(
      `SELECT user_id FROM artisan_profiles WHERE id = $1`,
      [artisanId],
    );
    await notifyUser(row?.userId, input);
  } catch (err) {
    console.error('notifyArtisan failed', err);
  }
}
