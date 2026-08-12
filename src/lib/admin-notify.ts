import { query, queryOne } from '@/lib/db';
import type { PaymentMethod, PlatformSetting } from '@/types/db';

export async function notifyAdmin(input: {
  type: string;
  title: string;
  body: string;
  href?: string;
  meta?: Record<string, unknown>;
}) {
  const rows = await query(
    `INSERT INTO admin_notifications (type, title, body, href, meta)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [
      input.type,
      input.title,
      input.body,
      input.href || null,
      input.meta ? JSON.stringify(input.meta) : null,
    ],
  );
  return rows[0];
}

export async function getOrCreatePlatformSettings(): Promise<PlatformSetting> {
  const existing = await queryOne<PlatformSetting>(
    `SELECT * FROM platform_settings ORDER BY updated_at DESC LIMIT 1`,
  );
  if (existing) return existing;

  const created = await queryOne<PlatformSetting>(
    `INSERT INTO platform_settings (commission_rate, subscription_fee, user_signup_fee, artisan_signup_fee)
     VALUES (12, 50, 20, 50)
     RETURNING *`,
  );
  if (!created) throw new Error('Unable to create platform settings.');
  return created;
}

/** Seed default Ghana payment methods if none exist. */
export async function ensureDefaultPaymentMethods() {
  const countRow = await queryOne<{ count: string }>(`SELECT count(*)::text AS count FROM payment_methods`);
  if (Number(countRow?.count || 0) > 0) return;

  await query(
    `INSERT INTO payment_methods
      (name, type, account_name, account_number, bank_name, instructions, sort_order, is_active)
     VALUES
      ('MTN MoMo', 'mtn_momo', 'Fixora Platform', '0240000000', NULL,
       'Send the signup fee via MTN Mobile Money, then enter the transaction ID.', 1, true),
      ('Telecel Cash', 'telecel_cash', 'Fixora Platform', '0200000000', NULL,
       'Send the signup fee via Telecel Cash, then enter the transaction ID.', 2, true),
      ('Bank transfer', 'bank_transfer', 'Fixora Ghana Ltd', '0123456789012', 'GCB Bank',
       'Transfer the signup fee and use your phone number as the narration.', 3, true)`,
  );
}

export async function listPaymentMethods(activeOnly = false): Promise<PaymentMethod[]> {
  return query<PaymentMethod>(
    activeOnly
      ? `SELECT * FROM payment_methods WHERE is_active = true ORDER BY sort_order ASC, name ASC`
      : `SELECT * FROM payment_methods ORDER BY sort_order ASC, name ASC`,
  );
}
