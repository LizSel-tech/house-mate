'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AdminPageHeader,
  EmptyState,
  StatusBadge,
  bookingStatusTone,
  formatGhs,
} from '@/components/admin/AdminUI';

type Booking = {
  id: string;
  status: string;
  createdAt?: string;
  payment: { escrowStatus: string; amount: string | number; commission: string | number } | null;
  service: { title: string } | null;
  user: { name: string };
  artisan: { user: { name: string } };
};

type StatusFilter = 'all' | 'active' | 'held' | 'completed' | 'disputed';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (res.ok) setBookings(data.bookings || []);
    };
    load();
  }, []);

  const held = bookings
    .filter((b) => b.payment?.escrowStatus === 'held')
    .reduce((s, b) => s + Number(b.payment?.amount || 0), 0);

  const activeCount = bookings.filter((b) => !['completed', 'cancelled'].includes(b.status)).length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;
  const disputedCount = bookings.filter((b) => b.status === 'disputed').length;
  const heldCount = bookings.filter((b) => b.payment?.escrowStatus === 'held').length;

  const visible = useMemo(() => {
    if (filter === 'active') return bookings.filter((b) => !['completed', 'cancelled'].includes(b.status));
    if (filter === 'held') return bookings.filter((b) => b.payment?.escrowStatus === 'held');
    if (filter === 'completed') return bookings.filter((b) => b.status === 'completed');
    if (filter === 'disputed') return bookings.filter((b) => b.status === 'disputed');
    return bookings;
  }, [bookings, filter]);

  const chips: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: bookings.length },
    { id: 'active', label: 'Active', count: activeCount },
    { id: 'held', label: 'Escrow held', count: heldCount },
    { id: 'completed', label: 'Completed', count: completedCount },
    { id: 'disputed', label: 'Disputed', count: disputedCount },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Operations"
        title="Bookings & escrow"
        description="Monitor job status, commissions, and held funds across the platform."
        actions={
          <div className="rounded-xl border border-border bg-card px-4 py-2.5 text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Held now</p>
            <p className="text-xl font-extrabold text-foreground tabular-nums">{formatGhs(held)}</p>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setFilter(c.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border ${
              filter === c.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {c.label} ({c.count})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="CalendarDaysIcon"
          title="No bookings match"
          description="Platform bookings will appear in this table as jobs are created."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Service', 'Customer', 'Artisan', 'Status', 'Escrow', 'Commission'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((booking) => (
                  <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-4 font-semibold text-foreground text-sm">
                      {booking.service?.title || 'Custom job'}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{booking.user.name}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{booking.artisan.user.name}</td>
                    <td className="px-5 py-4">
                      <StatusBadge tone={bookingStatusTone(booking.status)}>
                        {booking.status.replace(/_/g, ' ')}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {booking.payment
                        ? `${booking.payment.escrowStatus} · ${formatGhs(Number(booking.payment.amount))}`
                        : '—'}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {booking.payment ? formatGhs(Number(booking.payment.commission || 0)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            Showing {visible.length} of {bookings.length} bookings
          </div>
        </div>
      )}
    </div>
  );
}
