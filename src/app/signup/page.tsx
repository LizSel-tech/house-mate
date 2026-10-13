'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { sanitizePhoneInput } from '@/lib/auth/session-token';
import type { UserRole } from '@/types/auth';

type PaymentMethod = {
  id: string;
  name: string;
  type: string;
  accountName: string | null;
  accountNumber: string | null;
  bankName: string | null;
  instructions: string | null;
};

export default function SignupPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Extract<UserRole, 'user' | 'artisan'>>('user');
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [fees, setFees] = useState({ user: 20, artisan: 50 });
  const [methodId, setMethodId] = useState('');
  const [reference, setReference] = useState('');
  const [proof, setProof] = useState<File | null>(null);
  const [paystackEnabled, setPaystackEnabled] = useState(false);
  const [payWith, setPayWith] = useState<'paystack' | 'manual'>('manual');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [success, setSuccess] = useState('');
  const [paidOnline, setPaidOnline] = useState(false);
  const [loginPhone, setLoginPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prefillPhone = params.get('phone');
    const prefillEmail = params.get('email');
    const prefillRole = params.get('role');
    if (prefillPhone) setPhone(sanitizePhoneInput(prefillPhone));
    if (prefillEmail) setEmail(prefillEmail);
    if (prefillRole === 'user' || prefillRole === 'artisan') setRole(prefillRole);

    fetch('/api/public/payment-options')
      .then((r) => r.json())
      .then((data) => {
        setMethods(data.methods || []);
        if (data.fees) setFees(data.fees);
        if (data.methods?.[0]?.id) setMethodId(data.methods[0].id);
        if (data.paystackEnabled) {
          setPaystackEnabled(true);
          setPayWith('paystack');
        }
      })
      .catch(() => undefined);
  }, []);

  const fee = role === 'artisan' ? fees.artisan : fees.user;
  const selected = useMemo(
    () => methods.find((m) => m.id === methodId) || null,
    [methods, methodId]
  );

  const verifyOnlinePayment = async (paystackRef: string): Promise<boolean> => {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const res = await fetch('/api/auth/signup/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: paystackRef }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'We could not confirm the payment.');
        return false;
      }
      if (!data.pending) {
        setSuccess(data.message || 'Payment received — check your email for your sign-in code.');
        return true;
      }
      setNotice(data.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    setSuccess(
      'Your payment is still processing. As soon as Paystack confirms it, we’ll activate your account and email your sign-in code.'
    );
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setSuccess('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('name', name);
      form.append('phone', phone);
      form.append('email', email);
      form.append('role', role);
      form.append('payWith', payWith);
      if (payWith === 'manual') {
        form.append('methodId', methodId);
        form.append('reference', reference);
        if (proof) form.append('proof', proof);
      }

      const res = await fetch('/api/auth/signup', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Signup failed.');
        return;
      }

      if (data.mode === 'paystack') {
        const { default: PaystackPop } = await import('@paystack/inline-js');
        const outcome = await new Promise<{ reference?: string; error?: string }>((resolve) => {
          new PaystackPop().resumeTransaction(data.accessCode, {
            onSuccess: (tx) => resolve({ reference: tx.reference || data.reference }),
            onCancel: () => resolve({}),
            onError: (err) => resolve({ error: err?.message || 'The payment window could not open.' }),
          });
        });
        if (!outcome.reference) {
          setError(
            outcome.error ||
              'Payment cancelled. Your details are saved — submit again to pay and activate your account.'
          );
          return;
        }
        setNotice('Confirming your payment…');
        const done = await verifyOnlinePayment(outcome.reference);
        setNotice('');
        if (done) {
          setPaidOnline(true);
          setLoginPhone(data.phone || phone);
        }
        return;
      }

      setPaidOnline(false);
      setSuccess(
        data.message ||
          'Submitted. An admin will confirm your payment, then you’ll receive an OTP to log in.'
      );
      setName('');
      setPhone('');
      setEmail('');
      setReference('');
      setProof(null);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle={
        paystackEnabled
          ? 'Pay the signup fee online and get your sign-in code by email right away — or pay manually and upload proof for admin review.'
          : 'Pay the signup fee, upload proof, and wait for admin confirmation — then check your email for an OTP to log in.'
      }
    >
      {success ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
          <p className="text-sm text-muted-foreground">
            {paidOnline
              ? 'Open the email we sent you, then enter the code on the login page.'
              : 'Keep your phone handy. After confirmation you’ll get an OTP to sign in.'}
          </p>
          <Link
            href={
              paidOnline && loginPhone
                ? `/login?${new URLSearchParams({ phone: loginPhone, step: 'code' }).toString()}`
                : '/login'
            }
            className="inline-flex w-full items-center justify-center bg-primary text-primary-foreground py-3.5 rounded-full font-bold text-sm uppercase tracking-widest min-h-[48px]"
          >
            Go to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('user')}
              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                role === 'user'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <span className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-3">
                <Icon name="HomeIcon" size={18} />
              </span>
              <p className="text-sm font-bold text-foreground">I need help</p>
              <p className="text-xs text-muted-foreground mt-1">Customer · GHS {fees.user}</p>
            </button>
            <button
              type="button"
              onClick={() => setRole('artisan')}
              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                role === 'artisan'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <span className="w-9 h-9 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center mb-3">
                <Icon name="WrenchScrewdriverIcon" size={18} />
              </span>
              <p className="text-sm font-bold text-foreground">I provide work</p>
              <p className="text-xs text-muted-foreground mt-1">Service provider · GHS {fees.artisan}</p>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ama Mensah"
              className="w-full px-4 py-3.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Phone number</label>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              pattern="[0-9\s]*"
              value={phone}
              onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
              placeholder="024 123 4567"
              className="w-full px-4 py-3.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ama@email.com"
              className="w-full px-4 py-3.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Signup fee</p>
                <p className="text-2xl font-extrabold text-foreground mt-1">GHS {Number(fee).toFixed(2)}</p>
              </div>
              <Icon name="BanknotesIcon" size={22} className="text-primary" />
            </div>

            {paystackEnabled && (
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-background border border-border p-1">
                {(
                  [
                    { value: 'paystack', label: 'Pay online', hint: 'MoMo or card · instant' },
                    { value: 'manual', label: 'Pay manually', hint: 'Upload proof · admin review' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPayWith(option.value)}
                    className={`rounded-xl px-3 py-2.5 text-left transition-all ${
                      payWith === option.value ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/50'
                    }`}
                  >
                    <p className="text-sm font-bold text-foreground">{option.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{option.hint}</p>
                  </button>
                ))}
              </div>
            )}

            {payWith === 'paystack' ? (
              <p className="text-sm text-muted-foreground">
                You’ll pay securely with Paystack. Once the payment goes through, your account is activated and your
                sign-in code is emailed to you immediately.
              </p>
            ) : (
              <>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Payment method
                </label>
                <Select
                  value={methodId}
                  onChange={setMethodId}
                  placeholder={methods.length === 0 ? 'Loading methods…' : 'Select a method'}
                  options={methods.map((m) => ({ value: m.id, label: m.name }))}
                  required
                />
              </div>

              {selected && (
                <div className="rounded-xl bg-background border border-border p-3 text-sm space-y-1">
                  {selected.accountName && (
                    <p>
                      <span className="text-muted-foreground">Name:</span>{' '}
                      <span className="font-semibold text-foreground">{selected.accountName}</span>
                    </p>
                  )}
                  {selected.accountNumber && (
                    <p>
                      <span className="text-muted-foreground">Number:</span>{' '}
                      <span className="font-semibold text-foreground">{selected.accountNumber}</span>
                    </p>
                  )}
                  {selected.bankName && (
                    <p>
                      <span className="text-muted-foreground">Bank:</span>{' '}
                      <span className="font-semibold text-foreground">{selected.bankName}</span>
                    </p>
                  )}
                  {selected.instructions && (
                    <p className="text-muted-foreground pt-1">{selected.instructions}</p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Transaction reference *
                </label>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="MoMo / bank transfer ID"
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Payment proof (image/PDF) *
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setProof(e.target.files?.[0] || null)}
                  className="block w-full text-sm"
                  required
                />
              </div>
              </>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
          )}
          {notice && !error && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">{notice}</p>
          )}

          <Button
            type="submit"
            loading={loading}
            disabled={payWith === 'manual' && methods.length === 0}
            className="w-full min-h-[48px] text-sm"
          >
            {loading
              ? payWith === 'paystack'
                ? 'Processing payment…'
                : 'Submitting…'
              : payWith === 'paystack'
                ? `Pay GHS ${Number(fee).toFixed(2)} & create account`
                : 'Submit registration'}
          </Button>
        </form>
      )}

      <p className="mt-6 text-sm text-center text-muted-foreground">
        Already confirmed?{' '}
        <Link href="/login" className="font-semibold text-primary hover:text-accent">
          Log in with OTP
        </Link>
      </p>
    </AuthShell>
  );
}
