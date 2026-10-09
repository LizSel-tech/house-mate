'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import { AdminPageHeader, EmptyState, KpiCard, StatusBadge, formatDateTime } from '@/components/admin/AdminUI';
import { AdminModal, IconActionButton } from '@/components/admin/AdminModal';

export const NOTIFICATIONS_CHANGED = 'fixora:notifications-changed';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

type Filter = 'all' | 'unread';

function typeIcon(type: string) {
  if (type.startsWith('chat')) return 'ChatBubbleLeftRightIcon';
  if (type.includes('payout') || type.includes('escrow') || type.includes('payment')) return 'BanknotesIcon';
  if (type.includes('verification')) return 'ShieldCheckIcon';
  if (type.includes('review')) return 'StarIcon';
  if (type.includes('account')) return 'SparklesIcon';
  if (type.startsWith('booking')) return 'CalendarDaysIcon';
  return 'BellAlertIcon';
}

function typeLabel(type: string) {
  return type.replace(/_/g, ' ');
}

function announceChange() {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
}

export default function NotificationsInbox({ description }: { description: string }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Notification | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setItems(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAll = async () => {
    setBusy('all');
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      await load();
      announceChange();
    } finally {
      setBusy('');
    }
  };

  const markOne = async (id: string) => {
    setBusy(id);
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: now } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
      setSelected((cur) => (cur?.id === id && !cur.readAt ? { ...cur, readAt: now } : cur));
      announceChange();
    } finally {
      setBusy('');
    }
  };

  const openNotification = async (n: Notification) => {
    setSelected(n);
    if (!n.readAt) await markOne(n.id);
  };

  const visible = useMemo(
    () => (filter === 'unread' ? items.filter((n) => !n.readAt) : items),
    [items, filter],
  );
  const pager = usePagination(visible, { resetKey: filter });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Inbox"
        title="Notifications"
        description={description}
        actions={
          <Button
            type="button"
            variant="outline"
            loading={busy === 'all'}
            disabled={unreadCount === 0}
            onClick={markAll}
            className="!min-h-[40px] !rounded-xl"
          >
            Mark all read
          </Button>
        }
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <KpiCard label="Unread" value={String(unreadCount)} hint="Needs attention" icon="BellAlertIcon" />
        <KpiCard label="Total" value={String(items.length)} hint="In your inbox" icon="InboxIcon" />
      </div>

      <div className="flex gap-2">
        {([
          { id: 'all' as const, label: 'All' },
          { id: 'unread' as const, label: `Unread (${unreadCount})` },
        ]).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${
              filter === f.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-48 rounded-2xl border border-border bg-card animate-pulse" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="BellAlertIcon"
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          description="Booking, payment, verification, and message updates will appear here."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <ul className="divide-y divide-border">
            {pager.pageItems.map((n) => (
              <li
                key={n.id}
                className={`px-4 sm:px-5 py-3.5 flex items-start gap-3 ${!n.readAt ? 'bg-primary/[0.04]' : ''}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    n.readAt ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
                  }`}
                >
                  <Icon name={typeIcon(n.type)} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground text-sm">{n.title}</p>
                    {!n.readAt && <StatusBadge tone="primary">Unread</StatusBadge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-1.5">{formatDateTime(n.createdAt)}</p>
                </div>
                <div className="grid grid-cols-2 gap-1.5 shrink-0 self-center">
                  <IconActionButton
                    icon="EyeIcon"
                    label="Open details"
                    tone="primary"
                    onClick={() => void openNotification(n)}
                  />
                  {!n.readAt ? (
                    <IconActionButton
                      icon="CheckIcon"
                      label="Mark read"
                      tone="success"
                      disabled={busy === n.id}
                      onClick={() => void markOne(n.id)}
                    />
                  ) : (
                    <span className="h-9 w-9" aria-hidden />
                  )}
                </div>
              </li>
            ))}
          </ul>
          <Pagination {...pager.props} label="notifications" />
        </div>
      )}

      <AdminModal
        open={Boolean(selected)}
        title={selected?.title || 'Notification'}
        icon={selected ? typeIcon(selected.type) : 'BellAlertIcon'}
        onClose={() => setSelected(null)}
        footer={
          selected?.href ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelected(null)}
                className="flex-1 !rounded-xl"
              >
                Close
              </Button>
              <Link
                href={selected.href}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-xs font-bold uppercase tracking-widest"
                onClick={() => setSelected(null)}
              >
                Go to page
              </Link>
            </>
          ) : (
            <Button type="button" onClick={() => setSelected(null)} className="w-full !rounded-xl">
              Close
            </Button>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={selected.readAt ? 'neutral' : 'primary'}>
                {selected.readAt ? 'Read' : 'Unread'}
              </StatusBadge>
              <StatusBadge tone="neutral">{typeLabel(selected.type)}</StatusBadge>
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{selected.body}</p>
            <dl className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Received</dt>
              <dd className="mt-1 text-foreground">{formatDateTime(selected.createdAt)}</dd>
            </dl>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
