import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/auth/require-session';
import {
  ensureDefaultPaymentMethods,
  notifyAdmin,
} from '@/lib/admin-notify';
import { issueOtpToUser } from '@/lib/auth/otp';
import { query, queryData, queryDataOne, queryOne, withTransaction } from '@/lib/db';
import type { PaymentMethod, SignupPayment, User } from '@/types/db';

export async function GET() {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  await ensureDefaultPaymentMethods();

  const payments = await queryData(
    `SELECT to_jsonb(sp) || jsonb_build_object(
       'user', jsonb_build_object(
         'id', u.id, 'name', u.name, 'phone', u.phone, 'email', u.email,
         'role', u.role, 'account_status', u.account_status
       ),
       'method', to_jsonb(m),
       'reviewed_by', CASE WHEN rb.id IS NULL THEN NULL ELSE jsonb_build_object('name', rb.name) END
     ) AS data
     FROM signup_payments sp
     JOIN users u ON u.id = sp.user_id
     JOIN payment_methods m ON m.id = sp.method_id
     LEFT JOIN users rb ON rb.id = sp.reviewed_by
     ORDER BY sp.created_at DESC
     LIMIT 100`,
  );

  return NextResponse.json({ payments });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireSession(['admin']);
  if (error || !user) return error!;

  const body = (await request.json()) as {
    id?: string;
    status?: 'confirmed' | 'rejected';
    reason?: string;
  };

  if (!body.id || (body.status !== 'confirmed' && body.status !== 'rejected')) {
    return NextResponse.json({ error: 'id and status (confirmed|rejected) are required.' }, { status: 400 });
  }

  const payment = await queryDataOne<
    SignupPayment & { user: User; method: PaymentMethod }
  >(
    `SELECT to_jsonb(sp) || jsonb_build_object(
       'user', to_jsonb(u),
       'method', to_jsonb(m)
     ) AS data
     FROM signup_payments sp
     JOIN users u ON u.id = sp.user_id
     JOIN payment_methods m ON m.id = sp.method_id
     WHERE sp.id = $1`,
    [body.id],
  );
  if (!payment) {
    return NextResponse.json({ error: 'Payment not found.' }, { status: 404 });
  }
  if (payment.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending payments can be reviewed.' }, { status: 400 });
  }

  if (body.status === 'rejected') {
    await withTransaction(async (tx) => {
      await query(
        `UPDATE signup_payments
         SET status = 'rejected',
             rejection_reason = $1,
             reviewed_by = $2,
             reviewed_at = now()
         WHERE id = $3`,
        [body.reason?.trim() || 'Payment rejected by admin.', user.id, payment.id],
        tx,
      );
      await query(
        `UPDATE users SET account_status = 'pending_payment' WHERE id = $1`,
        [payment.userId],
        tx,
      );
    });

    await notifyAdmin({
      type: 'signup_payment_rejected',
      title: 'Signup payment rejected',
      body: `${payment.user.name} (${payment.user.phone}) — ${body.reason || 'no reason'}`,
      href: '/admin/payments',
    });

    return NextResponse.json({ ok: true, status: 'rejected' });
  }

  // Confirm payment → activate account → email OTP for login
  await withTransaction(async (tx) => {
    await query(
      `UPDATE signup_payments
       SET status = 'confirmed',
           rejection_reason = NULL,
           reviewed_by = $1,
           reviewed_at = now()
       WHERE id = $2`,
      [user.id, payment.id],
      tx,
    );
    await query(`UPDATE users SET account_status = 'active' WHERE id = $1`, [payment.userId], tx);
  });

  const freshUser = await queryOne<User>(`SELECT * FROM users WHERE id = $1`, [payment.userId]);

  let otpResult: { phone: string; email?: string; message: string; devCode?: string } | null = null;
  let otpError: string | null = null;

  try {
    if (!freshUser) throw new Error('Activated user not found.');
    otpResult = await issueOtpToUser({
      user: freshUser,
      purpose: 'login',
      reason: 'payment_approved',
    });
  } catch (err) {
    otpError = err instanceof Error ? err.message : 'Unable to email OTP.';
  }

  await notifyAdmin({
    type: 'signup_payment_confirmed',
    title: 'Signup payment confirmed',
    body: otpResult
      ? `${payment.user.name} activated. OTP emailed to ${otpResult.email || payment.user.email}.`
      : `${payment.user.name} activated, but OTP email failed: ${otpError}`,
    href: '/admin/payments',
    meta: {
      userId: payment.userId,
      ...(otpResult?.devCode ? { devCode: otpResult.devCode } : {}),
      ...(otpError ? { otpError } : {}),
    },
  });

  if (otpError) {
    return NextResponse.json({
      ok: true,
      status: 'confirmed',
      warning: otpError,
      message: 'Payment confirmed, but the OTP email could not be sent.',
    });
  }

  return NextResponse.json({
    ok: true,
    status: 'confirmed',
    otp: {
      phone: otpResult!.phone,
      email: otpResult!.email,
      message: otpResult!.message,
    },
  });
}
