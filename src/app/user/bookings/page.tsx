'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

type Booking = {
  id: string;
  status: string;
  location: string | null;
  problemDescription: string | null;
  agreedPrice: string | number | null;
  artisan: { user: { name: string; phone: string } };
  service: { title: string } | null;
  payment: { escrowStatus: string; amount: string | number; commission: string | number } | null;
  review: { id: string } | null;
};

function statusClass(status: string) {
  if (status === 'completed') return 'bg-green-100 text-green-800';
  if (status === 'cancelled') return 'bg-red-100 text-red-700';
  if (status === 'in_progress' || status === 'accepted') return 'bg-primary/10 text-primary';
  return 'bg-amber-100 text-amber-800';
}

export default function UserBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rating, setRating] = useState<Record<string, string>>({});
  const [comment, setComment] = useState<Record<string, string>>({});

  const load = async () => {
    const res = await fetch('/api/bookings');
    const data = await res.json();
    if (res.ok) setBookings(data.bookings || []);
  };

  useEffect(() => {
    load();
  }, []);

  const act = async (id: string, path: string) => {
    setError('');
    setMessage('');
    const res = await fetch(`/api/bookings/${id}/${path}`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Action failed.');
      return;
    }
    setMessage(data.message || 'Done.');
    await load();
  };

  const cancel = async (id: string) => {
    await fetch(`/api/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    await load();
  };

  const review = async (id: string) => {
    setError('');
    const res = await fetch(`/api/bookings/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating: Number(rating[id] || 5),
        comment: comment[id] || '',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Review failed.');
      return;
    }
    setMessage('Review submitted.');
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Activity</p>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">My bookings</h1>
          <p className="mt-2 text-muted-foreground">
            Track requests, escrow payments, confirmation, and reviews.
          </p>
        </div>
        <Link
          href="/user/search"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-full text-xs font-bold uppercase tracking-widest"
        >
          <Icon name="MagnifyingGlassIcon" size={16} />
          Find artisan
        </Link>
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3">{message}</p>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      {bookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <Icon name="CalendarDaysIcon" size={28} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground">No bookings yet</p>
          <p className="text-sm text-muted-foreground mt-1">Find an artisan and request a job to get started.</p>
          <Link
            href="/user/search"
            className="inline-flex mt-4 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"
          >
            Browse artisans
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="rounded-3xl border border-border bg-card p-5 sm:p-6 space-y-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-foreground text-lg">
                    {booking.service?.title || 'Custom job'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {booking.artisan.user.name} · {booking.artisan.user.phone}
                    {booking.location ? ` · ${booking.location}` : ''}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${statusClass(booking.status)}`}
                >
                  {booking.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-sm">
                <span className="font-semibold text-foreground">
                  GHS {Number(booking.agreedPrice || 0).toFixed(2)}
                </span>
                {booking.payment && (
                  <span className="text-muted-foreground">
                    Escrow {booking.payment.escrowStatus}
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
                  <button
                    type="button"
                    onClick={() => cancel(booking.id)}
                    className="px-4 py-2.5 rounded-full border border-border text-xs font-bold uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                )}
                {booking.status === 'accepted' && !booking.payment && (
                  <button
                    type="button"
                    onClick={() => act(booking.id, 'pay')}
                    className="px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest"
                  >
                    Pay into escrow
                  </button>
                )}
                {booking.payment?.escrowStatus === 'held' && (
                  <button
                    type="button"
                    onClick={() => act(booking.id, 'confirm')}
                    className="px-4 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest"
                  >
                    Confirm completion
                  </button>
                )}
              </div>

              {booking.payment?.escrowStatus === 'released' && !booking.review && (
                <div className="pt-4 border-t border-border space-y-3">
                  <p className="text-sm font-semibold text-foreground">Leave a review</p>
                  <select
                    value={rating[booking.id] || '5'}
                    onChange={(e) => setRating((prev) => ({ ...prev, [booking.id]: e.target.value }))}
                    className="px-4 py-2.5 rounded-2xl border border-border bg-background text-sm"
                  >
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} stars
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={comment[booking.id] || ''}
                    onChange={(e) => setComment((prev) => ({ ...prev, [booking.id]: e.target.value }))}
                    placeholder="How was the work?"
                    rows={2}
                    className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => review(booking.id)}
                    className="px-4 py-2.5 rounded-full bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-widest"
                  >
                    Submit review
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
