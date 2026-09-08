'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { BarChart, LineChart } from '@/components/admin/Charts';

type Booking = {
  id: string;
  status: string;
  location: string | null;
  agreedPrice: string | number | null;
  createdAt: string;
  user: { name: string };
  service: { title: string } | null;
  payment: { escrowStatus: string; amount: string | number; commission: string | number } | null;
};

function formatGhs(n: number) {
  return `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function statusClass(status: string) {
  if (status === 'completed') return 'bg-green-100 text-green-800';
  if (status === 'cancelled' || status === 'disputed') return 'bg-red-100 text-red-700';
  if (status === 'in_progress' || status === 'accepted') return 'bg-primary/10 text-primary';
  return 'bg-amber-100 text-amber-800';
}

function verifyClass(status: string) {
  if (status === 'approved') return 'bg-green-100 text-green-800';
  if (status === 'rejected') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-800';
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'short' });
}

function lastNMonths(n: number) {
  const keys: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

export default function ProviderDashboardPage() {
  const [name, setName] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [trade, setTrade] = useState('');
  const [serviceCount, setServiceCount] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [meRes, verifyRes, servicesRes, bookRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/provider/verification'),
          fetch('/api/provider/services'),
          fetch('/api/bookings'),
        ]);
        const me = await meRes.json().catch(() => ({}));
        const verify = await verifyRes.json().catch(() => ({}));
        const services = await servicesRes.json().catch(() => ({}));
        const bookData = await bookRes.json().catch(() => ({}));

        if (meRes.ok && me.user?.name) setName(me.user.name.split(' ')[0] || '');
        if (verifyRes.ok && verify.profile) {
          setVerificationStatus(verify.profile.verificationStatus || 'pending');
          setTrade(verify.profile.trade || '');
        }
        if (servicesRes.ok) setServiceCount((services.services || []).length);
        if (bookRes.ok) setBookings(bookData.bookings || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const newRequests = bookings.filter((b) => b.status === 'requested').length;
    const active = bookings.filter((b) => ['accepted', 'in_progress'].includes(b.status)).length;
    let held = 0;
    let released = 0;
    let paidJobs = 0;
    for (const b of bookings) {
      if (!b.payment) continue;
      const net = Number(b.payment.amount) - Number(b.payment.commission || 0);
      if (b.payment.escrowStatus === 'held') held += net;
      if (b.payment.escrowStatus === 'released') {
        released += net;
        paidJobs += 1;
      }
    }
    return { newRequests, active, held, released, paidJobs, total: bookings.length };
  }, [bookings]);

  const months = useMemo(() => lastNMonths(6), []);

  const jobsByMonth = useMemo(
    () =>
      months.map((month) => ({
        label: monthLabel(month),
        count: bookings.filter((b) => monthKey(new Date(b.createdAt)) === month).length,
      })),
    [bookings, months],
  );

  const earningsByMonth = useMemo(
    () =>
      months.map((month) => {
        let total = 0;
        for (const b of bookings) {
          if (!b.payment || b.payment.escrowStatus !== 'released') continue;
          if (monthKey(new Date(b.createdAt)) !== month) continue;
          total += Number(b.payment.amount) - Number(b.payment.commission || 0);
        }
        return { label: monthLabel(month), count: Math.round(total) };
      }),
    [bookings, months],
  );

  const checklist = useMemo(
    () => [
      {
        id: 'verify',
        done: verificationStatus === 'approved',
        label: 'Get identity verified',
        href: '/provider/verification',
      },
      {
        id: 'services',
        done: serviceCount > 0,
        label: 'List at least one service',
        href: '/provider/services',
      },
      {
        id: 'job',
        done: stats.total > 0,
        label: 'Receive your first job request',
        href: '/provider/jobs',
      },
    ],
    [verificationStatus, serviceCount, stats.total],
  );

  const attentionItems = useMemo(() => {
    const items: { id: string; title: string; href: string; tone: string }[] = [];
    if (verificationStatus !== 'approved') {
      items.push({
        id: 'kyc',
        title:
          verificationStatus === 'rejected'
            ? 'Verification was rejected — resubmit clearer documents'
            : 'Complete identity verification to appear in customer search',
        href: '/provider/verification',
        tone: 'border-amber-200 bg-amber-50 text-amber-900',
      });
    }
    if (serviceCount === 0) {
      items.push({
        id: 'services',
        title: 'Add services and prices so customers can book you',
        href: '/provider/services',
        tone: 'border-border bg-card text-foreground',
      });
    }
    if (stats.newRequests > 0) {
      items.push({
        id: 'requests',
        title: `${stats.newRequests} new job request${stats.newRequests > 1 ? 's' : ''} waiting for a response`,
        href: '/provider/jobs',
        tone: 'border-primary/20 bg-primary/5 text-foreground',
      });
    }
    return items;
  }, [verificationStatus, serviceCount, stats.newRequests]);

  const recent = bookings.slice(0, 5);
  const setupDone = checklist.every((c) => c.done);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
            Overview
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Hello{name ? `, ${name}` : ''}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground max-w-xl">
            {trade ? `${trade.charAt(0).toUpperCase()}${trade.slice(1)} · ` : ''}
            Track requests, jobs, and earnings on Fixora.
          </p>
          <span
            className={`inline-flex mt-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${verifyClass(verificationStatus)}`}
          >
            Verification {verificationStatus}
          </span>
        </div>
        <Link
          href="/provider/jobs"
          className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest min-h-[44px]"
        >
          <Icon name="BriefcaseIcon" size={16} />
          Job requests
          {!loading && stats.newRequests > 0 ? ` (${stats.newRequests})` : ''}
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Link
          href="/provider/jobs"
          className="rounded-2xl border border-border bg-card p-5 hover:border-primary/35 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="InboxIcon" size={18} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Open</span>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            New requests
          </p>
          <p className="mt-1 text-3xl font-extrabold text-foreground tabular-nums">
            {loading ? '…' : stats.newRequests}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{stats.active} active jobs in progress</p>
        </Link>
        <Link
          href="/provider/earnings"
          className="rounded-2xl border border-border bg-card p-5 hover:border-primary/35 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Icon name="LockClosedIcon" size={18} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Open</span>
          </div>
          <p className="mt-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Held in escrow
          </p>
          <p className="mt-1 text-3xl font-extrabold text-foreground tabular-nums">
            {loading ? '…' : formatGhs(stats.held)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {loading ? '…' : `${formatGhs(stats.released)} released to date`}
          </p>
        </Link>
      </div>

      {attentionItems.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Needs attention
          </h2>
          {attentionItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${item.tone}`}
            >
              <span>{item.title}</span>
              <Icon name="ChevronRightIcon" size={16} />
            </Link>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-bold text-foreground">Jobs · 6 months</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Monthly booking volume</p>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="h-48 rounded-xl bg-muted/50 animate-pulse" />
            ) : (
              <BarChart legend="Jobs" data={jobsByMonth} />
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-base font-bold text-foreground">Earnings · 6 months</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Released payouts (GHS, net of commission)</p>
          </div>
          <div className="p-5">
            {loading ? (
              <div className="h-48 rounded-xl bg-muted/50 animate-pulse" />
            ) : (
              <LineChart legend="Released earnings" data={earningsByMonth} />
            )}
          </div>
        </section>
      </div>

      {!setupDone && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-bold text-foreground">Get set up</h2>
          <p className="text-sm text-muted-foreground mt-1">Complete these steps to start winning jobs.</p>
          <ul className="mt-4 space-y-2">
            {checklist.map((item, i) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:border-primary/40 transition-colors"
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      item.done ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.done ? '✓' : i + 1}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      item.done ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { href: '/provider/jobs', title: 'Job requests', desc: 'Accept and manage bookings', icon: 'BriefcaseIcon' },
          { href: '/provider/services', title: 'Services', desc: `${serviceCount} listed`, icon: 'WrenchScrewdriverIcon' },
          { href: '/provider/earnings', title: 'Earnings', desc: `${stats.paidJobs} paid jobs`, icon: 'BanknotesIcon' },
          { href: '/provider/settings', title: 'Settings', desc: 'Privacy & preferences', icon: 'Cog6ToothIcon' },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border border-border bg-card p-4 hover:border-primary/40 transition-colors group"
          >
            <div className="w-9 h-9 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Icon name={item.icon} size={18} />
            </div>
            <h3 className="font-bold text-foreground text-sm">{item.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground capitalize">{item.desc}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Recent jobs</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Latest customer requests</p>
          </div>
          <Link href="/provider/jobs" className="text-xs font-bold uppercase tracking-widest text-primary">
            View all
          </Link>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No job requests yet. Get verified and list services to appear in search.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((b) => (
                <li key={b.id} className="py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {b.user.name} · {b.service?.title || 'Custom job'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {formatDate(b.createdAt)}
                      {b.agreedPrice != null ? ` · ${formatGhs(Number(b.agreedPrice))}` : ''}
                      {b.location ? ` · ${b.location}` : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${statusClass(b.status)}`}
                  >
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
