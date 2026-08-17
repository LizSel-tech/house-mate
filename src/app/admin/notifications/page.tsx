'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export default function AdminNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [busy, setBusy] = useState('');

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
      await load();
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Inbox</p>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Notifications</h1>
          <p className="mt-2 text-muted-foreground">
            Alerts for new registrations and signup payments ({unreadCount} unread).
          </p>
        </div>
        <Button type="button" variant="outline" loading={busy === 'all'} onClick={markAll}>
          Mark all read
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No notifications yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`rounded-3xl border p-5 ${
                n.readAt ? 'border-border bg-card' : 'border-primary/30 bg-primary/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-foreground">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <Icon name="BellAlertIcon" size={18} className="text-primary shrink-0" />
              </div>
              <div className="mt-3 flex gap-3">
                {n.href && (
                  <Link href={n.href} className="text-xs font-bold uppercase tracking-widest text-primary">
                    Open
                  </Link>
                )}
                {!n.readAt && (
                  <Button
                    type="button"
                    variant="ghost"
                    loading={busy === n.id}
                    onClick={() => markOne(n.id)}
                    className="!min-h-0 !px-0 !py-0"
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
