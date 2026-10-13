'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/Button';
import { PORTAL_HOME } from '@/lib/auth/constants';
import { sanitizePhoneInput } from '@/lib/auth/session-token';
import type { UserRole } from '@/types/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const linkedPhone = sanitizePhoneInput(searchParams.get('phone') || '').trim();
  const openedFromEmail = Boolean(linkedPhone) && searchParams.get('step') === 'code';

  const [phone, setPhone] = useState(linkedPhone);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(openedFromEmail);
  const [otpHint, setOtpHint] = useState(
    openedFromEmail ? 'Enter the 6-digit code from your email.' : '',
  );
  const [demoAdmin, setDemoAdmin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const resendOtp = async () => {
    setError('');
    setResent(false);
    setResending(true);
    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, purpose: 'login', demoAdmin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to resend the code.');
        return;
      }
      setOtp('');
      setOtpHint(
        data.email ? `New code sent to ${data.email}.` : data.message || 'New code sent.',
      );
      setResent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setResending(false);
    }
  };

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

          {process.env.NODE_ENV !== 'production' && (
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={demoAdmin}
                onChange={(e) => setDemoAdmin(e.target.checked)}
                className="mt-1 rounded border-border"
              />
              <span>
                Demo admin access (development only). Creates an admin for a new phone number.
              </span>
            </label>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full min-h-[48px] text-sm">
            {loading ? 'Sending…' : 'Send OTP'}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Signing in as
            </p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{phone}</p>
            <p className={`text-sm mt-1 ${resent ? 'text-green-700' : 'text-muted-foreground'}`}>
              {otpHint || 'Enter the 6-digit code we emailed you.'}
            </p>
          </div>

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
              autoComplete="one-time-code"
              autoFocus
              className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring tracking-widest"
              required
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Didn’t get it, or code expired?</span>
              <button
                type="button"
                onClick={resendOtp}
                disabled={resending}
                className="font-semibold text-primary hover:text-accent disabled:opacity-50"
              >
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full min-h-[48px] text-sm">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setOtpSent(false);
              setOtp('');
              setOtpHint('');
              setResent(false);
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
