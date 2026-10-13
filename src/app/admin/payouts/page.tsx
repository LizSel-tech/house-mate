'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import {
  AdminPageHeader,
  EmptyState,
  KpiCard,
  StatusBadge,
  formatDateTime,
  formatGhs,
} from '@/components/admin/AdminUI';
import { IconActionButton } from '@/components/admin/AdminModal';

type PayoutRow = {
  id: string;
  bookingId: string;
  title: string;
  amount: string | number;
  commission: string | number;
  payoutStatus: string;
  payoutAmount: string | number | null;
  payoutAttempts: number;
  payoutError: string | null;
  paidOutAt: string | null;
  createdAt: string;
  providerName: string;
  providerPhone: string;
  payoutBankName: string | null;
  payoutAccountNumber: string | null;
  hasRecipient: boolean;
  customerName: string;
};

type Filter = 'all' | 'failed' | 'pending' | 'paid' | 'manual';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'failed', label: 'Failed' },
  { id: 'pending', label: 'Sending' },
  { id: 'paid', label: 'Paid' },
  { id: 'manual', label: 'Outside Paystack' },
];

function statusTone(status: string): 'success' | 'warning' | 'danger' | 'primary' | 'neutral' {
  if (status === 'paid') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'pending') return 'primary';
  return 'neutral';
}

function statusLabel(status: string) {
  if (status === 'pending') return 'sending';
  if (status === 'manual') return 'outside paystack';
  return status;
}

const net = (p: PayoutRow) => Number(p.payoutAmount ?? Number(p.amount) - Number(p.commission));

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [mode, setMode] = useState<'live' | 'test' | 'off'>('off');
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/payouts');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFlash({ message: data.error || 'Failed to load payouts.', tone: 'error' });
        return;
      }
      setPayouts(data.payouts || []);
      setMode(data.mode || 'off');
      setBalance(data.balance ?? null);
      setBalanceError(data.balanceError || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const retry = async (row: PayoutRow) => {
    setBusyId(row.id);
    setFlash(null);
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId: row.id }),
      });
      const data = await res.json().catch(() => ({}));
      setFlash({
        message: res.ok ? data.message || 'Payout retried.' : data.error || 'Retry failed.',
        tone: res.ok ? 'success' : 'error',
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const totals = useMemo(() => {
    const sum = (status: string) =>
      payouts.filter((p) => p.payoutStatus === status).reduce((acc, p) => acc + net(p), 0);
    return {
      paid: sum('paid') + sum('manual'),
      pending: sum('pending'),
      failed: sum('failed'),
      failedCount: payouts.filter((p) => p.payoutStatus === 'failed').length,
    };
  }, [payouts]);

  const filtered = useMemo(
    () => (filter === 'all' ? payouts : payouts.filter((p) => p.payoutStatus === filter)),
    [payouts, filter],
  );
  const pager = usePagination(filtered, { resetKey: filter });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Money"
        title="Provider payouts"
        description="Escrow released to service providers through Paystack Transfers. Retry any payout that failed."
        actions={
          <Button type="button" variant="outline" onClick={load} className="!min-h-[40px]">
            <Icon name="ArrowPathIcon" size={16} className="mr-1.5" />
            Refresh
          </Button>
        }
      />

      {mode === 'off' && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          Paystack is not configured, so payments run in test mode and payouts are marked “outside Paystack”.
          Add <code className="font-mono">PAYSTACK_SECRET_KEY</code> to enable real payouts.
        </p>
      )}
      {mode === 'test' && (
        <p className="text-sm text-primary bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
          Paystack test mode — no real money moves.
        </p>
      )}
      {flash && (
        <p
          className={`text-sm rounded-xl px-4 py-3 border ${
            flash.tone === 'error'
              ? 'text-red-700 bg-red-50 border-red-100'
              : 'text-green-800 bg-green-50 border-green-100'
          }`}
        >
          {flash.message}
        </p>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KpiCard
          label="Paystack balance"
          value={mode === 'off' ? '—' : balance === null ? '…' : formatGhs(balance)}
          hint={balanceError || (mode === 'off' ? 'Not connected' : 'Available for payouts')}
          icon="BuildingLibraryIcon"
        />
        <KpiCard label="Paid out" value={loading ? '…' : formatGhs(totals.paid)} hint="Sent to providers" icon="CheckBadgeIcon" />
        <KpiCard label="Sending" value={loading ? '…' : formatGhs(totals.pending)} hint="Waiting for Paystack" icon="ClockIcon" />
        <KpiCard
          label="Failed"
          value={loading ? '…' : formatGhs(totals.failed)}
          hint={`${totals.failedCount} payout${totals.failedCount === 1 ? '' : 's'} need attention`}
          icon="ExclamationTriangleIcon"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${
              filter === f.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {!loading && filtered.length === 0 ? (
        <EmptyState
          icon="BanknotesIcon"
          title="No payouts here"
          description="Payouts appear once a client confirms a job and escrow is released."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Provider', 'Job', 'Net payout', 'Account', 'Status', 'Date', ''].map((h) => (
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
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td colSpan={7} className="px-5 py-4">
                          <div className="h-10 rounded-xl bg-muted/60 animate-pulse" />
                        </td>
                      </tr>
                    ))
                  : pager.pageItems.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0 align-top">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-foreground">{p.providerName}</p>
                          <p className="text-xs text-muted-foreground">{p.providerPhone}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm text-foreground">{p.title}</p>
                          <p className="text-xs text-muted-foreground">Client: {p.customerName}</p>
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold tabular-nums">{formatGhs(net(p))}</td>
                        <td className="px-5 py-4 text-sm">
                          {p.payoutAccountNumber ? (
                            <>
                              <p className="text-foreground">{p.payoutBankName}</p>
                              <p className="text-xs text-muted-foreground">
                                ···{p.payoutAccountNumber.slice(-4)}
                                {!p.hasRecipient && mode !== 'off' ? ' · not verified' : ''}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-red-600">No payout account</span>
                          )}
                        </td>
                        <td className="px-5 py-4 max-w-[240px]">
                          <StatusBadge tone={statusTone(p.payoutStatus)}>{statusLabel(p.payoutStatus)}</StatusBadge>
                          {p.payoutError && p.payoutStatus === 'failed' && (
                            <p className="text-xs text-red-600 mt-1.5">{p.payoutError}</p>
                          )}
                          {p.payoutAttempts > 1 && (
                            <p className="text-[11px] text-muted-foreground mt-1">{p.payoutAttempts} attempts</p>
                          )}
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                          {formatDateTime(p.paidOutAt || p.createdAt)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {p.payoutStatus === 'failed' && (
                            <IconActionButton
                              icon="ArrowPathIcon"
                              label="Retry payout"
                              tone="primary"
                              disabled={busyId === p.id}
                              onClick={() => retry(p)}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          {!loading && <Pagination {...pager.props} label="payouts" />}
        </div>
      )}
    </div>
  );
}
