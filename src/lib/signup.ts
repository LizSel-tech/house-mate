import { issueOtpToUser } from '@/lib/auth/otp';
import { notifyUser } from '@/lib/notify';
import type { User } from '@/types/db';

export type WelcomeResult = {
  otp: { phone: string; email?: string; message: string; devCode?: string } | null;
  otpError: string | null;
};

/** Emails the sign-in code and posts the welcome notification for a newly activated account. */
export async function welcomeActivatedUser(user: User): Promise<WelcomeResult> {
  let otp: WelcomeResult['otp'] = null;
  let otpError: string | null = null;
  try {
    otp = await issueOtpToUser({ user, purpose: 'login', reason: 'payment_approved' });
  } catch (err) {
    otpError = err instanceof Error ? err.message : 'Unable to email OTP.';
  }

  await notifyUser(user.id, {
    type: 'account_activated',
    title: 'Welcome to Craftviva',
    body:
      user.role === 'artisan'
        ? 'Your signup payment was confirmed. Complete identity verification to start receiving bookings.'
        : 'Your signup payment was confirmed. Find a verified service provider and book your first job.',
    href: user.role === 'artisan' ? '/provider/verification' : '/user/search',
  });

  return { otp, otpError };
}
