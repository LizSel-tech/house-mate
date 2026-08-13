'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import { PORTAL_HOME } from '@/lib/auth/constants';
import { sanitizePhoneInput } from '@/lib/auth/session-token';
import type { UserRole } from '@/types/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpHint, setOtpHint] = useState('');
  const [demoAdmin, setDemoAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'login', demoAdmin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to send OTP.');
        return;
      }
      setOtpHint(
        data.email
          ? `Code sent to ${data.email}.`
          : data.message || 'Check your email for the login code.',
      );
      setOtpSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, demoAdmin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Login failed.');
        return;
      }

      const role = data.user.role as UserRole;
      const fallback = PORTAL_HOME[role];
      const destination =
        nextPath && nextPath.startsWith(fallback) ? nextPath : data.redirectTo || fallback;
      router.push(destination);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="After your signup payment is approved, we’ll email you a login code. You can also request a new OTP here."
    >
      {!otpSent ? (
        <form onSubmit={sendOtp} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              pattern="[0-9\s]*"
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
              placeholder="024 123 4567"
              className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={demoAdmin}
              onChange={(e) => setDemoAdmin(e.target.checked)}
              className="mt-1 rounded border-border"
            />
            <span>
              Demo admin access (invite-only role). Check this only when testing the admin portal.
            </span>
          </label>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-accent transition-colors min-h-[48px] disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            {otpHint || (
              <>
                Code sent for <span className="font-semibold text-foreground">{phone}</span>.
              </>
            )}
          </p>

          <div className="flex flex-col gap-2">
            <label htmlFor="otp" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              One-time code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring tracking-widest"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-accent transition-colors min-h-[48px] disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <button
            type="button"
            onClick={() => {
              setOtpSent(false);
              setOtp('');
              setOtpHint('');
              setError('');
            }}
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            Use a different number
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-center text-muted-foreground">
        New here?{' '}
        <Link href="/signup" className="font-semibold text-primary hover:text-accent">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginForm />
    </Suspense>
  );
}
