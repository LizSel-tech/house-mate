'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

type Booking = {
  id: string;
  status: string;
  payment: { escrowStatus: string; amount: string | number; commission: string | number } | null;
  service: { title: string } | null;
  user: { name: string };
  artisan: { user: { name: string } };
};

function statusClass(status: string) {
  if (status === 'completed') return 'bg-green-100 text-green-800';
  if (status === 'cancelled' || status === 'disputed') return 'bg-red-100 text-red-700';
  if (status === 'in_progress' || status === 'accepted') return 'bg-primary/10 text-primary';
  return 'bg-amber-100 text-amber-800';
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Operations</p>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Bookings & escrow</h1>
          <p className="mt-2 text-muted-foreground">
            Monitor job status and held funds across the platform.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Held now</p>
          <p className="text-xl font-extrabold text-foreground">GHS {held.toFixed(2)}</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <Icon name="CalendarDaysIcon" size={28} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground">No bookings yet</p>
          <p className="text-sm text-muted-foreground mt-1">Platform bookings will appear in this table.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Service', 'Customer', 'Artisan', 'Status', 'Escrow'].map((h) => (
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
                {bookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-4 font-semibold text-foreground">
                      {booking.service?.title || 'Custom job'}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{booking.user.name}</td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">{booking.artisan.user.name}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${statusClass(booking.status)}`}
                      >
                        {booking.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {booking.payment
                        ? `${booking.payment.escrowStatus} · GHS ${Number(booking.payment.amount).toFixed(2)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
