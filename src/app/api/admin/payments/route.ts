import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin-access';
import {
  ensureDefaultPaymentMethods,
  notifyAdmin,
} from '@/lib/admin-notify';
import { normalizePhone } from '@/lib/auth/session-token';
import { isMailConfigured, sendSignupRejectedEmail } from '@/lib/mail';
import { notifyUser } from '@/lib/notify';
import { welcomeActivatedUser } from '@/lib/signup';
import { query, queryData, queryDataOne, queryOne, withTransaction } from '@/lib/db';
import type { PaymentMethod, SignupPayment, User } from '@/types/db';

export async function GET() {
  const { user, error } = await requireAdmin('payments.manage');
  if (error || !user) return error!;

  await ensureDefaultPaymentMethods();

  const payments = await queryData(
    `SELECT to_jsonb(sp) || jsonb_build_object(
       'user', jsonb_build_object(
         'id', u.id, 'name', u.name, 'phone', u.phone, 'email', u.email,
         'role', u.role, 'account_status', u.account_status
       ),
       'method', CASE WHEN m.id IS NULL THEN NULL ELSE to_jsonb(m) END,
       'reviewed_by', CASE WHEN rb.id IS NULL THEN NULL ELSE jsonb_build_object('name', rb.name) END
     ) AS data
     FROM signup_payments sp
     JOIN users u ON u.id = sp.user_id
     LEFT JOIN payment_methods m ON m.id = sp.method_id
     LEFT JOIN users rb ON rb.id = sp.reviewed_by
     ORDER BY sp.created_at DESC
     LIMIT 100`,
  );

  return NextResponse.json({ payments });
}

export async function PATCH(request: Request) {
  const { user, error } = await requireAdmin('payments.manage');
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
    SignupPayment & { user: User; method: PaymentMethod | null }
  >(
    `SELECT to_jsonb(sp) || jsonb_build_object(
       'user', to_jsonb(u),
       'method', CASE WHEN m.id IS NULL THEN NULL ELSE to_jsonb(m) END
     ) AS data
     FROM signup_payments sp
     JOIN users u ON u.id = sp.user_id
     LEFT JOIN payment_methods m ON m.id = sp.method_id
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
    const reason = body.reason?.trim() || 'Your signup payment could not be confirmed.';
    await withTransaction(async (tx) => {
      await query(
        `UPDATE signup_payments
         SET status = 'rejected',
             rejection_reason = $1,
             reviewed_by = $2,
             reviewed_at = now()
         WHERE id = $3`,
        [reason, user.id, payment.id],
        tx,
      );
      await query(
        `UPDATE users SET account_status = 'pending_payment' WHERE id = $1`,
        [payment.userId],
        tx,
      );
    });

    await notifyUser(payment.userId, {
      type: 'signup_payment_rejected',
      title: 'Signup payment rejected',
      body: `${reason} Please resubmit your payment.`,
    });

    let emailError: string | null = null;
    if (payment.user.email?.trim() && isMailConfigured()) {
      try {
        await sendSignupRejectedEmail({
          to: payment.user.email.trim(),
          name: payment.user.name,
          phone: normalizePhone(payment.user.phone) || payment.user.phone,
          role: payment.user.role,
          reason,
        });
      } catch (err) {
        emailError = err instanceof Error ? err.message : 'Unable to send email.';
      }
    } else {
      emailError = 'No email address or mail is not configured.';
    }

    await notifyAdmin({
      type: 'signup_payment_rejected',
      title: 'Signup payment rejected',
      body: `${payment.user.name} (${payment.user.phone}) — ${reason}${emailError ? ` (email not sent: ${emailError})` : ''}`,
      href: '/admin/payments',
    });

    return NextResponse.json({
      ok: true,
      status: 'rejected',
      ...(emailError ? { warning: `Rejection email not sent: ${emailError}` } : {}),
    });
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
  const { otp: otpResult, otpError } = freshUser
    ? await welcomeActivatedUser(freshUser)
    : { otp: null, otpError: 'Activated user not found.' };

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

  if (otpError || !otpResult) {
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
      phone: otpResult.phone,
      email: otpResult.email,
      message: otpResult.message,
    },
  });
}
