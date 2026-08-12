'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

type Booking = {
  id: string;
  status: string;
  location: string | null;
  problemDescription: string | null;
  agreedPrice: string | number | null;
  user: { name: string; phone: string };
  service: { title: string } | null;
  payment: { escrowStatus: string; amount: string | number; commission: string | number } | null;
};

function statusClass(status: string) {
  if (status === 'completed') return 'bg-green-100 text-green-800';
  if (status === 'cancelled') return 'bg-red-100 text-red-700';
  if (status === 'in_progress' || status === 'accepted') return 'bg-primary/10 text-primary';
  return 'bg-amber-100 text-amber-800';
}

export default function ProviderJobsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'requested' | 'active' | 'done'>('all');

  const load = async () => {
    const res = await fetch('/api/bookings');
    const data = await res.json();
    if (res.ok) setBookings(data.bookings || []);
  };

  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id: string, status: string) => {
    setError('');
    const res = await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Update failed.');
      return;
    }
    await load();
  };

  const filtered = useMemo(() => {
    if (filter === 'requested') return bookings.filter((b) => b.status === 'requested');
    if (filter === 'active') return bookings.filter((b) => ['accepted', 'in_progress'].includes(b.status));
    if (filter === 'done') return bookings.filter((b) => ['completed', 'cancelled'].includes(b.status));
    return bookings;
  }, [bookings, filter]);

  const counts = useMemo(
    () => ({
      all: bookings.length,
      requested: bookings.filter((b) => b.status === 'requested').length,
      active: bookings.filter((b) => ['accepted', 'in_progress'].includes(b.status)).length,
      done: bookings.filter((b) => ['completed', 'cancelled'].includes(b.status)).length,
    }),
    [bookings]
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Pipeline</p>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Job requests</h1>
        <p className="mt-2 text-muted-foreground">
          Accept bookings, start work after escrow is paid, then mark jobs complete.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'All'],
            ['requested', 'New'],
            ['active', 'Active'],
            ['done', 'Done'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border ${
              filter === id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground'
            }`}
          >
            {label} ({counts[id]})
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <Icon name="BriefcaseIcon" size={28} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground">No jobs in this view</p>
          <p className="text-sm text-muted-foreground mt-1">New customer requests will show up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((booking) => (
            <div key={booking.id} className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-4 hover:border-primary/30 transition-colors">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-foreground text-lg">
                    {booking.service?.title || 'Custom job'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {booking.user.name} · {booking.user.phone}
                    {booking.location ? ` · ${booking.location}` : ''}
                  </p>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${statusClass(booking.status)}`}>
                  {booking.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <span className="font-semibold text-foreground">
                  GHS {Number(booking.agreedPrice || 0).toFixed(2)}
                </span>
                {booking.payment && (
                  <span className="text-muted-foreground">
                    Escrow {booking.payment.escrowStatus} · GHS {Number(booking.payment.amount).toFixed(2)}
                  </span>
                )}
              </div>

              {booking.problemDescription && (
                <p className="text-sm text-muted-foreground bg-muted/40 rounded-2xl px-4 py-3">
                  {booking.problemDescription}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {booking.status === 'requested' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setStatus(booking.id, 'accepted')}
                      className="px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(booking.id, 'cancelled')}
                      className="px-4 py-2.5 rounded-full border border-border text-xs font-bold uppercase tracking-widest"
                    >
                      Decline
                    </button>
                  </>
                )}
                {booking.status === 'accepted' && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                    Waiting for customer escrow payment…
                  </p>
                )}
                {booking.status === 'in_progress' && (
                  <button
                    type="button"
                    onClick={() => setStatus(booking.id, 'completed')}
                    className="px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest"
                  >
                    Mark work done
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
