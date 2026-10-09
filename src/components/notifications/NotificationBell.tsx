'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { NOTIFICATIONS_CHANGED } from '@/components/notifications/NotificationsInbox';

const POLL_MS = 30_000;

export default function NotificationBell({
  href,
  tone = 'light',
}: {
  href: string;
  tone?: 'light' | 'dark';
}) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const active = pathname.startsWith(href);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications?count=1', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setCount(Number(data.unreadCount || 0));
    } catch {
      // Network blips shouldn't surface in the header.
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, POLL_MS);
    const onChange = () => void refresh();
    window.addEventListener(NOTIFICATIONS_CHANGED, onChange);
    window.addEventListener('focus', onChange);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(NOTIFICATIONS_CHANGED, onChange);
      window.removeEventListener('focus', onChange);
    };
  }, [refresh]);

  const onDark = tone === 'dark';

  return (
    <Link
      href={href}
      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : onDark
            ? 'bg-white/10 text-white hover:bg-white/20'
            : 'border border-border bg-card text-foreground hover:bg-muted'
      }`}
    >
      <Icon name="BellIcon" size={18} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-[18px] text-center tabular-nums">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
