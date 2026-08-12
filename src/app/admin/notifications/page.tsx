'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

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
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    await load();
  };

  const markOne = async (id: string) => {
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    await load();
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
        <button
          type="button"
          onClick={markAll}
          className="border border-border px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"
        >
          Mark all read
        </button>
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
                  <button
                    type="button"
                    onClick={() => markOne(n.id)}
                    className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
