import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import type { SignupPayload } from '@/types/auth';
import { normalizePhone } from '@/lib/auth/session-token';
import { notifyAdmin, getOrCreatePlatformSettings } from '@/lib/admin-notify';
import { isDatabaseConfigured, query, queryOne, withTransaction } from '@/lib/db';
import { logger } from '@/lib/logger';
import { isMomoProvider, maskMomo, normalizeGhanaMomo, type MomoProvider } from '@/lib/momo';
import {
  PaystackError,
  chargeMobileMoney,
  initializeTransaction,
  isPaystackConfigured,
} from '@/lib/paystack';
import { saveUpload } from '@/lib/uploads';
import type { PaymentMethod, SignupPayment, User } from '@/types/db';

const roleLabel = (role: string) => (role === 'artisan' ? 'service provider' : 'client');

/**
 * Signup with the registration fee, paid either through Paystack (activated automatically once paid)
 * or manually with a proof upload (admin review). An unpaid or rejected registration can be resubmitted
 * with the same phone and email.
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
    const payWithRaw = String(form.get('payWith') || 'manual');
    const payWith = payWithRaw === 'paystack' || payWithRaw === 'momo' ? payWithRaw : 'manual';
    const momoProvider = String(form.get('momoProvider') || '').trim();
    const momoPhone = normalizeGhanaMomo(String(form.get('momoPhone') || '').trim() || phoneRaw);
    const methodId = String(form.get('methodId') || '').trim();
    const reference = String(form.get('reference') || '').trim();
    const proof = form.get('proof');

    if (!name || !phoneRaw) {
      return NextResponse.json({ error: 'Name and phone are required.' }, { status: 400 });
    }
    if (!emailRaw || !emailRaw.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email is required so we can send your login OTP after payment.' },
        { status: 400 },
      );
    }
    if (role !== 'user' && role !== 'artisan') {
      return NextResponse.json(
        { error: 'Choose Service User or Service Provider.' },
        { status: 400 },
      );
    }
    if (payWith !== 'manual' && !isPaystackConfigured()) {
      return NextResponse.json(
        { error: 'Online payment is not available right now. Pay manually and upload your proof.' },
        { status: 400 },
      );
    }
    if (payWith === 'momo') {
      if (!isMomoProvider(momoProvider)) {
        return NextResponse.json({ error: 'Choose your mobile money network.' }, { status: 400 });
      }
      if (!momoPhone) {
        return NextResponse.json(
          { error: 'Enter a valid 10-digit Ghana mobile money number, e.g. 024 123 4567.' },
          { status: 400 },
        );
      }
    }
    if (payWith === 'manual') {
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
    }

    const phone = normalizePhone(phoneRaw) || phoneRaw;
    const email = emailRaw;

    const existing = await queryOne<User>(
      `SELECT * FROM users WHERE phone = $1 OR phone = $2 LIMIT 1`,
      [phone, phoneRaw],
    );
    if (existing) {
      if (existing.role === 'admin' || existing.accountStatus !== 'pending_payment') {
        return NextResponse.json(
          { error: 'An account with this phone already exists. Please log in.' },
          { status: 409 },
        );
      }
      const latest = await queryOne<SignupPayment>(
        `SELECT * FROM signup_payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [existing.id],
      );
      if (latest?.status === 'pending') {
        return NextResponse.json(
          { error: 'Your registration is already awaiting admin review. You’ll get an email once it’s approved.' },
          { status: 409 },
        );
      }
      if ((existing.email || '').trim().toLowerCase() !== email.toLowerCase()) {
        return NextResponse.json(
          {
            error:
              'This phone number already has a registration. Use the same email you signed up with to resubmit your payment.',
          },
          { status: 409 },
        );
      }
      if (existing.role !== role) {
        return NextResponse.json(
          { error: `This phone was registered as a ${roleLabel(existing.role)}. Choose that account type to resubmit.` },
          { status: 409 },
        );
      }
    }

    const settings = await getOrCreatePlatformSettings();
    const amount =
      role === 'artisan' ? Number(settings.artisanSignupFee) : Number(settings.userSignupFee);

    let method: PaymentMethod | null = null;
    let proofUrl: string | null = null;
    if (payWith === 'manual') {
      method = await queryOne<PaymentMethod>(
        `SELECT * FROM payment_methods WHERE id = $1 AND is_active = true`,
        [methodId],
      );
      if (!method) {
        return NextResponse.json({ error: 'Invalid payment method.' }, { status: 400 });
      }
      try {
        proofUrl = await saveUpload(proof as File, 'payments');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Proof upload failed.';
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }

    const user = await withTransaction(async (tx) => {
      let account = existing;
      if (!account) {
        account = await queryOne<User>(
          `INSERT INTO users (name, phone, email, role, account_status)
           VALUES ($1, $2, $3, $4, 'pending_payment')
           RETURNING *`,
          [name, phone, email, role],
          tx,
        );
        if (!account) throw new Error('Unable to create user.');
        if (role === 'artisan') {
          await queryOne(
            `INSERT INTO artisan_profiles (user_id, trade) VALUES ($1, '')`,
            [account.id],
            tx,
          );
        }
      }

      if (payWith === 'manual') {
        await queryOne(
          `INSERT INTO signup_payments (user_id, method_id, amount, role, reference, proof_url, status, provider)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'manual')`,
          [account.id, method!.id, amount, role, reference, proofUrl],
          tx,
        );
      }
      return account;
    });

    if (payWith === 'paystack') {
      const paystackRef = `cv_su_${user.id.slice(0, 8)}_${Date.now()}_${randomBytes(3).toString('hex')}`;
      await query(
        `INSERT INTO paystack_transactions (reference, purpose, user_id, amount, commission)
         VALUES ($1, 'signup', $2, $3, 0)`,
        [paystackRef, user.id, amount],
      );
      try {
        const init = await initializeTransaction({
          email,
          amountGhs: amount,
          reference: paystackRef,
          metadata: { purpose: 'signup', userId: user.id, role },
        });
        await query(
          `UPDATE paystack_transactions SET access_code = $2, updated_at = now() WHERE reference = $1`,
          [paystackRef, init.access_code],
        );
        return NextResponse.json({
          ok: true,
          mode: 'paystack',
          reference: paystackRef,
          accessCode: init.access_code,
          authorizationUrl: init.authorization_url,
          phone,
          amount,
        });
      } catch (err) {
        await query(
          `UPDATE paystack_transactions SET status = 'failed', gateway_response = $2, updated_at = now() WHERE reference = $1`,
          [paystackRef, err instanceof Error ? err.message : 'Initialize failed'],
        );
        await logger.error('paystack.signup', 'Initialize transaction failed', err, { reference: paystackRef });
        const message = err instanceof PaystackError ? err.message : 'Could not start the payment.';
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }

    if (payWith === 'momo') {
      const paystackRef = `cv_su_${user.id.slice(0, 8)}_${Date.now()}_${randomBytes(3).toString('hex')}`;
      await query(
        `INSERT INTO paystack_transactions (reference, purpose, user_id, amount, commission, channel)
         VALUES ($1, 'signup', $2, $3, 0, 'mobile_money')`,
        [paystackRef, user.id, amount],
      );
      try {
        const charge = await chargeMobileMoney({
          email,
          amountGhs: amount,
          reference: paystackRef,
          phone: momoPhone!,
          provider: momoProvider as MomoProvider,
          metadata: { purpose: 'signup', userId: user.id, role },
        });
        if (charge.status === 'failed') {
          const reason = charge.message || charge.gateway_response || 'The mobile money network declined the request.';
          void logger.warn('paystack.signup', 'Mobile money charge declined', { reference: paystackRef, reason });
          await query(
            `UPDATE paystack_transactions SET status = 'failed', gateway_response = $2, updated_at = now() WHERE reference = $1`,
            [paystackRef, reason],
          );
          return NextResponse.json({ error: reason }, { status: 402 });
        }
        return NextResponse.json({
          ok: true,
          mode: 'momo',
          reference: paystackRef,
          status: charge.status,
          displayText: charge.display_text || null,
          momoPhone: maskMomo(momoPhone!),
          phone,
          amount,
        });
      } catch (err) {
        await query(
          `UPDATE paystack_transactions SET status = 'failed', gateway_response = $2, updated_at = now() WHERE reference = $1`,
          [paystackRef, err instanceof Error ? err.message : 'Charge failed'],
        );
        await logger.error('paystack.signup', 'Mobile money charge failed', err, {
          reference: paystackRef,
          provider: momoProvider,
        });
        const message = err instanceof PaystackError ? err.message : 'Could not send the payment prompt.';
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }

    await notifyAdmin({
      type: 'signup_registration',
      title: existing ? 'Registration resubmitted' : 'New registration submitted',
      body: `${name} ${existing ? 'resubmitted their signup payment' : 'signed up'} as ${roleLabel(role)} (${phone}).`,
      href: '/admin/payments',
      meta: { userId: user.id, role, phone },
    });

    await notifyAdmin({
      type: 'signup_payment',
      title: 'Signup payment awaiting review',
      body: `${name} paid GHS ${amount.toFixed(2)} via ${method!.name}. Ref: ${reference}`,
      href: '/admin/payments',
      meta: { userId: user.id, method: method!.name, reference, amount },
    });

    return NextResponse.json({
      ok: true,
      mode: 'manual',
      message:
        'Registration submitted. An admin will confirm your payment, then you’ll receive an OTP by email to log in.',
      phone,
      amount,
      persistence: 'postgres',
    });
  } catch (err) {
    await logger.error('auth.signup', 'Signup failed', err);
    return NextResponse.json({ error: 'Unable to complete signup right now. Please try again.' }, { status: 500 });
  }
}
