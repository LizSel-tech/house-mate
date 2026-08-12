import { NextResponse } from 'next/server';
import type { SignupPayload } from '@/types/auth';
import { normalizePhone } from '@/lib/auth/session-token';
import { notifyAdmin, getOrCreatePlatformSettings } from '@/lib/admin-notify';
import { isDatabaseConfigured, queryOne, withTransaction } from '@/lib/db';
import { saveUpload } from '@/lib/uploads';
import type { PaymentMethod, User } from '@/types/db';

/**
 * Signup with required registration payment proof.
 * Creates pending_payment user — no session until admin confirms.
 */
export async function POST(request: Request) {
  try {
    if (!isDatabaseConfigured()) {
      return NextResponse.json(
        {
          error:
            'Database is not configured. Set DATABASE_HOST, DATABASE_USER, and DATABASE_NAME in .env and restart the server.',
        },
        { status: 503 },
      );
    }

    const form = await request.formData();
    const name = String(form.get('name') || '').trim();
    const phoneRaw = String(form.get('phone') || '').trim();
    const emailRaw = String(form.get('email') || '').trim();
    const role = String(form.get('role') || '').trim() as SignupPayload['role'];
    const methodId = String(form.get('methodId') || '').trim();
    const reference = String(form.get('reference') || '').trim();
    const proof = form.get('proof');

    if (!name || !phoneRaw) {
      return NextResponse.json({ error: 'Name and phone are required.' }, { status: 400 });
    }
    if (role !== 'user' && role !== 'artisan') {
      return NextResponse.json(
        { error: 'Choose Service User or Service Provider.' },
        { status: 400 },
      );
    }
    if (!methodId || !reference) {
      return NextResponse.json(
        { error: 'Select a payment method and enter your transaction reference.' },
        { status: 400 },
      );
    }
    if (!(proof instanceof File) || proof.size === 0) {
      return NextResponse.json(
        { error: 'Upload a payment proof screenshot or PDF.' },
        { status: 400 },
      );
    }

    const phone = normalizePhone(phoneRaw) || phoneRaw;
    const email = emailRaw || null;

    const existing = await queryOne<User>(
      `SELECT * FROM users WHERE phone = $1 OR phone = $2 LIMIT 1`,
      [phone, phoneRaw],
    );
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this phone already exists. Please log in.' },
        { status: 409 },
      );
    }

    const method = await queryOne<PaymentMethod>(
      `SELECT * FROM payment_methods WHERE id = $1 AND is_active = true`,
      [methodId],
    );
    if (!method) {
      return NextResponse.json({ error: 'Invalid payment method.' }, { status: 400 });
    }

    const settings = await getOrCreatePlatformSettings();
    const amount =
      role === 'artisan' ? Number(settings.artisanSignupFee) : Number(settings.userSignupFee);

    let proofUrl: string;
    try {
      proofUrl = await saveUpload(proof, 'payments');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Proof upload failed.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const user = await withTransaction(async (tx) => {
      const created = await queryOne<User>(
        `INSERT INTO users (name, phone, email, role, account_status)
         VALUES ($1, $2, $3, $4, 'pending_payment')
         RETURNING *`,
        [name, phone, email, role],
        tx,
      );
      if (!created) throw new Error('Unable to create user.');

      if (role === 'artisan') {
        await queryOne(
          `INSERT INTO artisan_profiles (user_id, trade) VALUES ($1, 'plumber')`,
          [created.id],
          tx,
        );
      }

      await queryOne(
        `INSERT INTO signup_payments (user_id, method_id, amount, role, reference, proof_url, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
        [created.id, method.id, amount, role, reference, proofUrl],
        tx,
      );

      return created;
    });

    await notifyAdmin({
      type: 'signup_registration',
      title: 'New registration submitted',
      body: `${name} signed up as ${role === 'artisan' ? 'artisan' : 'customer'} (${phone}).`,
      href: '/admin/payments',
      meta: { userId: user.id, role, phone },
    });

    await notifyAdmin({
      type: 'signup_payment',
      title: 'Signup payment awaiting review',
      body: `${name} paid GHS ${amount.toFixed(2)} via ${method.name}. Ref: ${reference}`,
      href: '/admin/payments',
      meta: { userId: user.id, method: method.name, reference, amount },
    });

    return NextResponse.json({
      ok: true,
      message:
        'Registration submitted. An admin will confirm your payment, then you’ll receive an OTP to log in.',
      phone,
      amount,
      persistence: 'postgres',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unable to sign up.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
