'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import { BarChart, DonutChart, HorizontalBars, LineChart } from '@/components/admin/Charts';
import {
  AdminPageHeader,
  AttentionTile,
  KpiCard,
  Panel,
  StatusBadge,
  bookingStatusTone,
  formatDateTime,
  formatGhs,
  formatShortDate,
} from '@/components/admin/AdminUI';

type StatsPayload = {
  generatedAt?: string;
  kpis: {
    totalUsers: number;
    customers: number;
    artisans: number;
    admins: number;
    artisansApproved: number;
    artisansPending: number;
    pendingKyc: number;
    pendingPayments: number;
    unreadNotifications: number;
    disputedBookings: number;
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
    userGrowthMonthly?: { month: string; label: string; count: number }[];
    bookingGrowthMonthly?: { month: string; label: string; count: number }[];
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

function roleLabel(role: string) {
  if (role === 'user') return 'customer';
  return role;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
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
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = stats?.kpis;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Live platform health across users, KYC, bookings, escrow, and signup payments."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              loading={refreshing}
              onClick={() => load(true)}
              className="!min-h-[40px]"
            >
              <Icon name="ArrowPathIcon" size={16} className="mr-1.5" />
              Refresh
            </Button>
            <Link
              href="/admin/payments"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest"
            >
              <Icon name="BanknotesIcon" size={16} />
              Payments
              {kpis && kpis.pendingPayments > 0 ? ` (${kpis.pendingPayments})` : ''}
            </Link>
            <Link
              href="/admin/verifications"
              className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-foreground"
            >
              <Icon name="ShieldCheckIcon" size={16} />
              KYC
              {kpis && kpis.pendingKyc > 0 ? ` (${kpis.pendingKyc})` : ''}
            </Link>
          </>
        }
      />

      {stats?.generatedAt && (
        <p className="text-xs text-muted-foreground -mt-3">
          Last updated {formatDateTime(stats.generatedAt)}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
      )}

      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Needs attention
        </p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <AttentionTile
            href="/admin/payments"
            label="Signup payments"
            count={kpis?.pendingPayments ?? 0}
            icon="BanknotesIcon"
          />
          <AttentionTile
            href="/admin/verifications"
            label="KYC queue"
            count={kpis?.pendingKyc ?? 0}
            icon="ShieldCheckIcon"
          />
          <AttentionTile
            href="/admin/notifications"
            label="Unread alerts"
            count={kpis?.unreadNotifications ?? 0}
            icon="BellAlertIcon"
          />
          <AttentionTile
            href="/admin/bookings"
            label="Disputed bookings"
            count={kpis?.disputedBookings ?? 0}
            icon="ExclamationTriangleIcon"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        <KpiCard
          label="Total users"
          value={loading ? '…' : String(kpis?.totalUsers ?? 0)}
          hint={`${kpis?.customers ?? 0} customers · ${kpis?.artisans ?? 0} artisans · ${kpis?.admins ?? 0} admins`}
          icon="UsersIcon"
          href="/admin/users"
        />
        <KpiCard
          label="Artisans live"
          value={loading ? '…' : String(kpis?.artisansApproved ?? 0)}
          hint={`${kpis?.artisansPending ?? 0} pending verification`}
          icon="WrenchScrewdriverIcon"
          href="/admin/verifications"
        />
        <KpiCard
          label="Active bookings"
          value={loading ? '…' : String(kpis?.activeBookings ?? 0)}
          hint={`${kpis?.totalBookings ?? 0} total bookings`}
          icon="CalendarDaysIcon"
          href="/admin/bookings"
        />
        <KpiCard
          label="Held in escrow"
          value={loading ? '…' : formatGhs(kpis?.heldEscrow ?? 0)}
          hint="Funds awaiting job completion"
          icon="BanknotesIcon"
          href="/admin/bookings"
        />
        <KpiCard
          label="Pending KYC"
          value={loading ? '…' : String(kpis?.pendingKyc ?? 0)}
          hint="Identity reviews waiting"
          icon="IdentificationIcon"
          href="/admin/verifications"
        />
        <KpiCard
          label="Signup payments"
          value={loading ? '…' : String(kpis?.pendingPayments ?? 0)}
          hint="Awaiting confirmation"
          icon="CreditCardIcon"
          href="/admin/payments"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="New users · 12 months" description="Monthly sign-ups across all roles">
          {loading || !stats ? (
            <div className="h-48 rounded-xl bg-muted/50 animate-pulse" />
          ) : (
            <LineChart
              legend="New users"
              data={(stats.charts.userGrowthMonthly || []).map((d) => ({
                label: d.label,
                count: d.count,
              }))}
            />
          )}
        </Panel>
        <Panel title="New bookings · 12 months" description="Monthly booking volume">
          {loading || !stats ? (
            <div className="h-48 rounded-xl bg-muted/50 animate-pulse" />
          ) : (
            <BarChart
              legend="New bookings"
              data={(stats.charts.bookingGrowthMonthly || []).map((d) => ({
                label: d.label,
                count: d.count,
              }))}
            />
          )}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Users by type" description="Platform mix" className="lg:col-span-1">
          {loading || !stats ? (
            <div className="h-40 rounded-xl bg-muted/50 animate-pulse" />
          ) : (
            <DonutChart data={stats.charts.usersByRole} size={148} />
          )}
        </Panel>
        <Panel title="Bookings by status" description="Pipeline snapshot">
          {loading || !stats ? (
            <div className="h-36 rounded-xl bg-muted/50 animate-pulse" />
          ) : (
            <HorizontalBars data={stats.charts.bookingsByStatus} />
          )}
        </Panel>
        <Panel title="Artisan verification" description="Approval funnel">
          {loading || !stats ? (
            <div className="h-36 rounded-xl bg-muted/50 animate-pulse" />
          ) : (
            <HorizontalBars data={stats.charts.verificationStatus} />
          )}
        </Panel>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel
          title="Recent users"
          description="Latest account activity"
          action={
            <Link href="/admin/users" className="text-xs font-bold uppercase tracking-widest text-primary">
              View all
            </Link>
          }
        >
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full min-w-[420px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Name', 'Role', 'Phone', 'Joined'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(stats?.recent.users || []).map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-semibold text-foreground text-sm">{u.name}</td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={u.role === 'artisan' ? 'primary' : u.role === 'admin' ? 'neutral' : 'warning'}>
                        {roleLabel(u.role)}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{u.phone}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatShortDate(u.createdAt)}
                    </td>
                  </tr>
                ))}
                {!loading && (stats?.recent.users.length || 0) === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel
          title="Recent bookings"
          description="Jobs and escrow status"
          action={
            <Link href="/admin/bookings" className="text-xs font-bold uppercase tracking-widest text-primary">
              View all
            </Link>
          }
        >
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="w-full min-w-[480px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {['Parties', 'Status', 'Amount', 'Date'].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(stats?.recent.bookings || []).map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-foreground">
                        {b.customer} → {b.artisan}
                      </p>
                      {b.escrowStatus && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">Escrow {b.escrowStatus}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={bookingStatusTone(String(b.status))}>
                        {String(b.status).replace(/_/g, ' ')}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {b.amount != null ? formatGhs(b.amount) : '—'}
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatShortDate(String(b.createdAt))}
                    </td>
                  </tr>
                ))}
                {!loading && (stats?.recent.bookings.length || 0) === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">
                      No bookings yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
