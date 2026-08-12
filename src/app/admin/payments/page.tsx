'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

type Payment = {
  id: string;
  amount: string | number;
  reference: string;
  proofUrl: string;
  status: string;
  role: string;
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
  user: { name: string; phone: string; email: string | null; role: string };
  method: { name: string; type: string };
  reviewedBy: { name: string } | null;
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const load = async () => {
    const res = await fetch('/api/admin/payments');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'Failed to load payments.');
      return;
    }
    setPayments(data.payments || []);
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id: string, status: 'confirmed' | 'rejected') => {
    setError('');
    setMessage('');
    setBusyId(id);
    try {
      const reason =
        status === 'rejected'
          ? window.prompt('Optional rejection reason:') || undefined
          : undefined;
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Update failed.');
        return;
      }
      if (status === 'confirmed') {
        setMessage(
          data.otp?.devCode
            ? `Payment confirmed. OTP sent (dev: ${data.otp.devCode}).`
            : 'Payment confirmed. OTP issued to the user.'
        );
      } else {
        setMessage('Payment rejected.');
      }
      await load();
    } finally {
      setBusyId('');
    }
  };

  const visible =
    filter === 'pending' ? payments.filter((p) => p.status === 'pending') : payments;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Registrations
          </p>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Signup payments</h1>
          <p className="mt-2 text-muted-foreground">
            Confirm payment proofs to activate accounts and auto-send login OTPs.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pending</p>
          <p className="text-xl font-extrabold text-foreground">{pendingCount}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border ${
            filter === 'pending'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground'
          }`}
        >
          Pending
        </button>
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground'
          }`}
        >
          All
        </button>
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">{message}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <Icon name="BanknotesIcon" size={28} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground">No payments here</p>
          <p className="text-sm text-muted-foreground mt-1">New signup payments will appear in this queue.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((p) => (
            <div key={p.id} className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-foreground">{p.user.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {p.user.phone}
                    {p.user.email ? ` · ${p.user.email}` : ''} · {p.role}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
                    p.status === 'confirmed'
                      ? 'bg-green-100 text-green-800'
                      : p.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {p.status}
                </span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-2xl bg-muted/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount</p>
                  <p className="font-bold text-foreground mt-1">GHS {Number(p.amount).toFixed(2)}</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Method</p>
                  <p className="font-bold text-foreground mt-1">{p.method.name}</p>
                </div>
                <div className="rounded-2xl bg-muted/40 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reference</p>
                  <p className="font-bold text-foreground mt-1 break-all">{p.reference}</p>
                </div>
              </div>

              <a
                href={p.proofUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                <Icon name="DocumentTextIcon" size={16} />
                View payment proof
              </a>

              {p.rejectionReason && (
                <p className="text-sm text-red-600">Reason: {p.rejectionReason}</p>
              )}

              {p.status === 'pending' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => decide(p.id, 'confirmed')}
                    className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest disabled:opacity-60"
                  >
                    {busyId === p.id ? 'Saving…' : 'Confirm & send OTP'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => decide(p.id, 'rejected')}
                    className="px-5 py-2.5 rounded-full border border-border text-xs font-bold uppercase tracking-widest disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
