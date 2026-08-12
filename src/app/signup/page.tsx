'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import Icon from '@/components/ui/AppIcon';
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/public/payment-options')
      .then((r) => r.json())
      .then((data) => {
        setMethods(data.methods || []);
        if (data.fees) setFees(data.fees);
        if (data.methods?.[0]?.id) setMethodId(data.methods[0].id);
      })
      .catch(() => undefined);
  }, []);

  const fee = role === 'artisan' ? fees.artisan : fees.user;
  const selected = useMemo(
    () => methods.find((m) => m.id === methodId) || null,
    [methods, methodId]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const form = new FormData();
      form.append('name', name);
      form.append('phone', phone);
      form.append('email', email);
      form.append('role', role);
      form.append('methodId', methodId);
      form.append('reference', reference);
      if (proof) form.append('proof', proof);

      const res = await fetch('/api/auth/signup', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Signup failed.');
        return;
      }
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
      subtitle="Pay the signup fee, upload proof, and wait for admin confirmation — then log in with OTP."
    >
      {success ? (
        <div className="space-y-5">
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {success}
          </div>
          <p className="text-sm text-muted-foreground">
            Keep your phone handy. After confirmation you’ll get an OTP to sign in.
          </p>
          <Link
            href="/login"
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
              <p className="text-xs text-muted-foreground mt-1">Artisan · GHS {fees.artisan}</p>
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
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="024 123 4567"
              className="w-full px-4 py-3.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ama@email.com"
              className="w-full px-4 py-3.5 rounded-2xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Payment method
              </label>
              <select
                value={methodId}
                onChange={(e) => setMethodId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm"
                required
              >
                {methods.length === 0 && <option value="">Loading methods…</option>}
                {methods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
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
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || methods.length === 0}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-accent transition-colors min-h-[48px] disabled:opacity-60"
          >
            {loading ? 'Submitting…' : 'Submit registration'}
          </button>
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
