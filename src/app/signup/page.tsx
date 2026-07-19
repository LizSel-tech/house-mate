'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import AuthShell from '@/components/auth/AuthShell';
import type { UserRole } from '@/types/auth';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Extract<UserRole, 'user' | 'artisan'>>('user');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email: email || undefined, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Signup failed.');
        return;
      }
      router.push(data.redirectTo);
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Sign up as a service user or artisan. Admins are invited separately."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRole('user')}
            className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
              role === 'user'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <p className="text-sm font-bold text-foreground">I need help</p>
            <p className="text-xs text-muted-foreground mt-1">Service user</p>
          </button>
          <button
            type="button"
            onClick={() => setRole('artisan')}
            className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
              role === 'artisan'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/40'
            }`}
          >
            <p className="text-sm font-bold text-foreground">I provide work</p>
            <p className="text-xs text-muted-foreground mt-1">Artisan</p>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Full name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ama Mensah"
            className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Phone number
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="024 123 4567"
            className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Email (optional)
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ama@email.com"
            className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-center text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:text-accent">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
