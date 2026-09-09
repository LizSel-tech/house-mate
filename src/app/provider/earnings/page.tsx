'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';

type PayoutRow = {
  id: string;
  title: string;
  amount: number;
  escrowStatus: string;
  createdAt?: string;
};

function formatGhs(n: number) {
  return `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ProviderEarningsPage() {
  const [held, setHeld] = useState(0);
  const [released, setReleased] = useState(0);
  const [jobs, setJobs] = useState(0);
  const [rows, setRows] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/bookings');
        const data = await res.json();
        if (!res.ok) return;
        const bookings = data.bookings || [];
        let h = 0;
        let r = 0;
        let completed = 0;
        const payouts: PayoutRow[] = [];
        for (const b of bookings) {
          if (!b.payment) continue;
          const net = Number(b.payment.amount) - Number(b.payment.commission);
          if (b.payment.escrowStatus === 'held') h += net;
          if (b.payment.escrowStatus === 'released') {
            r += net;
            completed += 1;
          }
          if (b.payment.escrowStatus === 'held' || b.payment.escrowStatus === 'released') {
            payouts.push({
              id: b.id,
              title: b.service?.title || b.title || 'Job',
              amount: net,
              escrowStatus: b.payment.escrowStatus,
              createdAt: b.payment.createdAt || b.createdAt,
            });
          }
        }
        setHeld(h);
        setReleased(r);
        setJobs(completed);
        setRows(payouts);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      }),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
            Money
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Earnings</h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            Track held escrow and released payouts (mock Paystack for MVP).
          </p>
        </div>
        <Link href="/provider/jobs">
          <Button type="button" variant="outline" className="!rounded-xl !min-h-[40px]">
            <Icon name="BriefcaseIcon" size={16} />
            View jobs
          </Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          {
            label: 'Available',
            value: formatGhs(released),
            icon: 'BanknotesIcon',
            hint: 'Released after customer confirms',
          },
          {
            label: 'In escrow',
            value: formatGhs(held),
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
          <div key={stat.label} className="rounded-2xl border border-border bg-card px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-1 text-xl font-extrabold text-foreground tabular-nums tracking-tight">
                  {loading ? '—' : stat.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon name={stat.icon} size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Payout activity</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Escrow holds and released amounts</p>
          </div>
        </div>
        {sorted.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 mx-auto rounded-xl bg-muted text-muted-foreground flex items-center justify-center mb-3">
              <Icon name="BanknotesIcon" size={22} />
            </div>
            <p className="font-semibold text-foreground">No payouts yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Accepted jobs with payment will show escrow and release activity here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Job', 'Net amount', 'Status', 'Date'].map((h) => (
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
                {sorted.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-sm font-semibold text-foreground">{row.title}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold tabular-nums">
                      {formatGhs(row.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                          row.escrowStatus === 'released'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {row.escrowStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground whitespace-nowrap">
                      {row.createdAt
                        ? new Date(row.createdAt).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-secondary text-secondary-foreground p-5 sm:p-6">
        <h2 className="text-base font-bold">How payouts work</h2>
        <ol className="mt-4 grid sm:grid-cols-3 gap-4">
          {[
            'Customer pays into escrow after you accept the job.',
            'You complete the work and mark it done.',
            'Customer confirms — Fixora releases your net amount (minus commission).',
          ].map((text, i) => (
            <li key={text} className="flex gap-3">
              <span className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center text-sm font-extrabold shrink-0">
                {i + 1}
              </span>
              <p className="text-sm text-secondary-foreground/80 leading-relaxed pt-1">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
