import { NextResponse } from 'next/server';
import type { SignupPayload } from '@/types/auth';
import { normalizePhone } from '@/lib/auth/session-token';
import { notifyAdmin, getOrCreatePlatformSettings } from '@/lib/admin-notify';
import { isDatabaseConfigured, prisma } from '@/lib/db';
import { saveUpload } from '@/lib/uploads';

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
            'DATABASE_URL is not set. Add your Postgres connection string to .env and restart the server.',
        },
        { status: 503 }
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
        { status: 400 }
      );
    }
    if (!methodId || !reference) {
      return NextResponse.json(
        { error: 'Select a payment method and enter your transaction reference.' },
        { status: 400 }
      );
    }
    if (!(proof instanceof File) || proof.size === 0) {
      return NextResponse.json(
        { error: 'Upload a payment proof screenshot or PDF.' },
        { status: 400 }
      );
    }

    const phone = normalizePhone(phoneRaw) || phoneRaw;
    const email = emailRaw || undefined;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ phone }, { phone: phoneRaw }] },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this phone already exists. Please log in.' },
        { status: 409 }
      );
    }

    const method = await prisma.paymentMethod.findFirst({
      where: { id: methodId, isActive: true },
    });
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

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name,
          phone,
          email,
          role,
          accountStatus: 'pending_payment',
          ...(role === 'artisan'
            ? { artisanProfile: { create: { trade: 'plumber' } } }
            : {}),
        },
      });

      await tx.signupPayment.create({
        data: {
          userId: created.id,
          methodId: method.id,
          amount,
          role,
          reference,
          proofUrl,
          status: 'pending',
        },
      });

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
