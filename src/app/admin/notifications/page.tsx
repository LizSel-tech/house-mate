'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import {
  AdminPageHeader,
  EmptyState,
  KpiCard,
  StatusBadge,
  formatDateTime,
} from '@/components/admin/AdminUI';
import { AdminModal, IconActionButton } from '@/components/admin/AdminModal';

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
  if (type.includes('payment')) return 'BanknotesIcon';
  if (type.includes('kyc') || type.includes('verif')) return 'ShieldCheckIcon';
  if (type.includes('signup') || type.includes('registration')) return 'UserPlusIcon';
  return 'BellAlertIcon';
}

function typeLabel(type: string) {
  return type.replace(/_/g, ' ');
}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Notification | null>(null);

  const load = async () => {
    const res = await fetch('/api/admin/notifications');
    const data = await res.json();
    if (res.ok) {
      setItems(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const markAll = async () => {
    setBusy('all');
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      await load();
    } finally {
      setBusy('');
    }
  };

  const markOne = async (id: string) => {
    setBusy(id);
    try {
      await fetch('/api/admin/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      setItems((prev) =>
        prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      setSelected((cur) =>
        cur?.id === id && !cur.readAt ? { ...cur, readAt: new Date().toISOString() } : cur,
      );
    } finally {
      setBusy('');
    }
  };

  const openNotification = async (n: Notification) => {
    setSelected(n);
    if (!n.readAt) {
      await markOne(n.id);
    }
  };

  const visible = useMemo(
    () => (filter === 'unread' ? items.filter((n) => !n.readAt) : items),
    [items, filter],
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Alerts for registrations, payments, and platform events."
        actions={
          <Button type="button" variant="outline" loading={busy === 'all'} onClick={markAll} className="!min-h-[40px] !rounded-xl">
            Mark all read
          </Button>
        }
      />

      <div className="grid sm:grid-cols-2 gap-3">
        <KpiCard
          label="Unread"
          value={String(unreadCount)}
          hint="Needs attention"
          icon="BellAlertIcon"
        />
        <KpiCard
          label="Total alerts"
          value={String(items.length)}
          hint="Loaded in inbox"
          icon="InboxIcon"
        />
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

      {visible.length === 0 ? (
        <EmptyState
          icon="BellAlertIcon"
          title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          description="New registration and payment alerts will appear here."
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <ul className="divide-y divide-border">
            {visible.map((n) => (
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
                <div className="flex items-center gap-1.5 shrink-0">
                  <IconActionButton
                    icon="EyeIcon"
                    label="Open details"
                    tone="primary"
                    onClick={() => void openNotification(n)}
                  />
                  {!n.readAt && (
                    <IconActionButton
                      icon="CheckIcon"
                      label="Mark read"
                      tone="success"
                      disabled={busy === n.id}
                      onClick={() => void markOne(n.id)}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
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
            <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Received</dt>
                <dd className="mt-1 text-foreground">{formatDateTime(selected.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</dt>
                <dd className="mt-1 text-foreground">{selected.readAt ? 'Marked as read' : 'Unread'}</dd>
              </div>
            </dl>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
