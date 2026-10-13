import { issueOtpToUser } from '@/lib/auth/otp';
import { notifyUser } from '@/lib/notify';
import type { User } from '@/types/db';

/** Emails a sign-in link + code to an account an admin created or re-invited. */
export async function sendAccountInvite(user: User): Promise<{ email?: string; warning?: string; devCode?: string }> {
  try {
    const result = await issueOtpToUser({ user, purpose: 'login', reason: 'account_created' });
    return { email: result.email, devCode: result.devCode };
  } catch (err) {
    return { warning: err instanceof Error ? err.message : 'Unable to email the sign-in code.' };
  }
}

export async function notifyNewAccount(user: User) {
  if (user.role === 'admin') return;
  await notifyUser(user.id, {
    type: 'account_activated',
    title: 'Welcome to Craftviva',
    body:
      user.role === 'artisan'
        ? 'An administrator created your provider account. Complete identity verification to start receiving bookings.'
        : 'An administrator created your account. Find a verified service provider and book your first job.',
    href: user.role === 'artisan' ? '/provider/verification' : '/user/search',
  });
}

export function cleanEmail(raw: unknown): string | null {
  const value = String(raw ?? '').trim();
  if (!value) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.toLowerCase() : null;
}
