'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { BarChart, DonutChart, HorizontalBars } from '@/components/admin/Charts';

type StatsPayload = {
  kpis: {
    totalUsers: number;
    customers: number;
    artisans: number;
    admins: number;
    artisansApproved: number;
    artisansPending: number;
    pendingKyc: number;
    activeBookings: number;
    totalBookings: number;
    heldEscrow: number;
  };
  charts: {
    usersByRole: { label: string; value: number; color: string }[];
    bookingsByStatus: { label: string; value: number }[];
    verificationStatus: { label: string; value: number; color: string }[];
    userGrowth: { day: string; count: number }[];
    bookingGrowth: { day: string; count: number }[];
  };
  recent: {
    users: { id: string; name: string; role: string; phone: string; createdAt: string }[];
    bookings: {
      id: string;
      status: string;
      createdAt: string;
      customer: string;
      artisan: string;
      amount: number | null;
      escrowStatus: string | null;
    }[];
  };
};

function formatGhs(n: number) {
  return `GHS ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/stats');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error || 'Failed to load dashboard.');
          return;
        }
        setStats(data);
        setError('');
      } catch {
        setError('Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const kpis = stats?.kpis;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Admin
          </p>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Dashboard</h1>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Live view of users, KYC queue, bookings, and escrow across Fixora.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/payments"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"
          >
            <Icon name="BanknotesIcon" size={16} />
            Signup payments
          </Link>
          <Link
            href="/admin/verifications"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"
          >
            <Icon name="ShieldCheckIcon" size={16} />
            Review KYC
            {kpis && kpis.pendingKyc > 0 ? ` (${kpis.pendingKyc})` : ''}
          </Link>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 border border-border px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest text-foreground"
          >
            <Icon name="UsersIcon" size={16} />
            Users
          </Link>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          {
            label: 'Total users',
            value: loading ? '…' : String(kpis?.totalUsers ?? 0),
            hint: `${kpis?.customers ?? 0} customers`,
            icon: 'UsersIcon',
          },
          {
            label: 'Artisans live',
            value: loading ? '…' : String(kpis?.artisansApproved ?? 0),
            hint: `${kpis?.artisansPending ?? 0} pending verify`,
            icon: 'WrenchScrewdriverIcon',
          },
          {
            label: 'Active bookings',
            value: loading ? '…' : String(kpis?.activeBookings ?? 0),
            hint: `${kpis?.totalBookings ?? 0} total`,
            icon: 'CalendarDaysIcon',
          },
          {
            label: 'Held in escrow',
            value: loading ? '…' : formatGhs(kpis?.heldEscrow ?? 0),
            hint: `${kpis?.pendingKyc ?? 0} KYC waiting`,
            icon: 'BanknotesIcon',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-3xl border border-border bg-card p-4 sm:p-5 relative overflow-hidden"
          >
            <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full bg-primary/5" />
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Icon name={stat.icon} size={18} />
            </div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1.5 text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">New users · 14 days</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Daily sign-ups across all roles</p>
            </div>
          </div>
          {loading || !stats ? (
            <div className="h-48 rounded-2xl bg-muted/50 animate-pulse" />
          ) : (
            <BarChart
              data={stats.charts.userGrowth.map((d) => ({
                label: d.day,
                count: d.count,
              }))}
            />
          )}
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-foreground mb-1">Users by type</h2>
          <p className="text-xs text-muted-foreground mb-4">Platform mix</p>
          {loading || !stats ? (
            <div className="h-40 rounded-2xl bg-muted/50 animate-pulse" />
          ) : (
            <DonutChart data={stats.charts.usersByRole} />
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-foreground mb-1">Bookings by status</h2>
          <p className="text-xs text-muted-foreground mb-4">Pipeline snapshot</p>
          {loading || !stats ? (
            <div className="h-36 rounded-2xl bg-muted/50 animate-pulse" />
          ) : (
            <HorizontalBars data={stats.charts.bookingsByStatus} />
          )}
        </div>
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-foreground mb-1">Artisan verification</h2>
          <p className="text-xs text-muted-foreground mb-4">Approval funnel</p>
          {loading || !stats ? (
            <div className="h-36 rounded-2xl bg-muted/50 animate-pulse" />
          ) : (
            <HorizontalBars data={stats.charts.verificationStatus} />
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Recent users</h2>
            <Link href="/admin/users" className="text-xs font-bold uppercase tracking-widest text-primary">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {(stats?.recent.users || []).map((u) => (
              <li key={u.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {u.phone} · {u.role}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(u.createdAt)}</span>
              </li>
            ))}
            {!loading && (stats?.recent.users.length || 0) === 0 && (
              <li className="py-6 text-sm text-muted-foreground text-center">No users yet.</li>
            )}
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Recent bookings</h2>
            <Link href="/admin/bookings" className="text-xs font-bold uppercase tracking-widest text-primary">
              View all
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {(stats?.recent.bookings || []).map((b) => (
              <li key={b.id} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-foreground truncate">
                    {b.customer} → {b.artisan}
                  </p>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary shrink-0">
                    {b.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(b.createdAt)}
                  {b.amount != null ? ` · ${formatGhs(b.amount)}` : ''}
                  {b.escrowStatus ? ` · escrow ${b.escrowStatus}` : ''}
                </p>
              </li>
            ))}
            {!loading && (stats?.recent.bookings.length || 0) === 0 && (
              <li className="py-6 text-sm text-muted-foreground text-center">No bookings yet.</li>
            )}
          </ul>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          {
            href: '/admin/verifications',
            title: 'KYC queue',
            desc: 'Approve or reject artisan identity checks',
            icon: 'ShieldCheckIcon',
          },
          {
            href: '/admin/bookings',
            title: 'Bookings & escrow',
            desc: 'Monitor jobs and held payments',
            icon: 'CalendarDaysIcon',
          },
          {
            href: '/admin/settings',
            title: 'Platform fees',
            desc: 'Commission and subscription settings',
            icon: 'Cog6ToothIcon',
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-3xl border border-border bg-card p-5 hover:border-primary/40 transition-colors group"
          >
            <div className="w-9 h-9 rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center mb-3 group-hover:bg-primary transition-colors">
              <Icon name={item.icon} size={18} />
            </div>
            <h2 className="text-base font-bold text-foreground">{item.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
