'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

export default function ProviderEarningsPage() {
  const [held, setHeld] = useState(0);
  const [released, setReleased] = useState(0);
  const [jobs, setJobs] = useState(0);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (!res.ok) return;
      const bookings = data.bookings || [];
      let h = 0;
      let r = 0;
      let completed = 0;
      for (const b of bookings) {
        if (b.payment?.escrowStatus === 'held') h += Number(b.payment.amount) - Number(b.payment.commission);
        if (b.payment?.escrowStatus === 'released') {
          r += Number(b.payment.amount) - Number(b.payment.commission);
          completed += 1;
        }
      }
      setHeld(h);
      setReleased(r);
      setJobs(completed);
    };
    load();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Money</p>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Earnings</h1>
          <p className="mt-2 text-muted-foreground">
            Track held escrow and released payouts (mock Paystack for MVP).
          </p>
        </div>
        <Link
          href="/provider/jobs"
          className="inline-flex items-center gap-2 border border-border px-5 py-3 rounded-full text-xs font-bold uppercase tracking-widest"
        >
          View jobs
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Available (released)',
            value: `GHS ${released.toFixed(2)}`,
            icon: 'BanknotesIcon',
            hint: 'Ready after customer confirms',
          },
          {
            label: 'In escrow',
            value: `GHS ${held.toFixed(2)}`,
            icon: 'LockClosedIcon',
            hint: 'Held until job completion',
          },
          {
            label: 'Paid jobs',
            value: String(jobs),
            icon: 'CheckBadgeIcon',
            hint: 'Completed with released funds',
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-border bg-card p-5 relative overflow-hidden">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-primary/5" />
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Icon name={stat.icon} size={18} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-foreground tracking-tight">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-secondary text-secondary-foreground p-6 sm:p-8">
        <h2 className="text-lg font-bold">How payouts work</h2>
        <ol className="mt-4 space-y-2 text-sm text-secondary-foreground/75 list-decimal list-inside">
          <li>Customer pays into escrow after you accept the job.</li>
          <li>You complete the work and mark it done.</li>
          <li>Customer confirms — Fixora releases your net amount (minus commission).</li>
        </ol>
      </div>
    </div>
  );
}
