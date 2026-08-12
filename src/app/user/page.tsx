'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

type Booking = {
  id: string;
  status: string;
  location: string | null;
  problemDescription: string | null;
  agreedPrice: string | number | null;
  createdAt: string;
  artisan: { user: { name: string; phone: string } };
  service: { title: string } | null;
  payment: { escrowStatus: string; amount: string | number } | null;
  review: { id: string } | null;
};

const TRADES = [
  { label: 'Plumber', trade: 'plumber', icon: 'WrenchScrewdriverIcon' },
  { label: 'Electrician', trade: 'electrician', icon: 'BoltIcon' },
  { label: 'Carpenter', trade: 'carpenter', icon: 'HomeIcon' },
  { label: 'Painter', trade: 'painter', icon: 'PaintBrushIcon' },
  { label: 'Cleaner', trade: 'cleaner', icon: 'SparklesIcon' },
  { label: 'AC tech', trade: 'ac', icon: 'CpuChipIcon' },
];

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

export default function UserDashboardPage() {
  const [name, setName] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [meRes, bookRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/bookings'),
        ]);
        const me = await meRes.json().catch(() => ({}));
        const bookData = await bookRes.json().catch(() => ({}));
        if (meRes.ok && me.user?.name) setName(me.user.name.split(' ')[0] || '');
        if (bookRes.ok) setBookings(bookData.bookings || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const active = bookings.filter((b) =>
      ['requested', 'accepted', 'in_progress'].includes(b.status)
    ).length;
    const needsPay = bookings.filter(
      (b) => ['accepted', 'in_progress'].includes(b.status) && !b.payment
    ).length;
    const needsConfirm = bookings.filter(
      (b) => b.status === 'in_progress' && b.payment?.escrowStatus === 'held'
    ).length;
    const needsReview = bookings.filter((b) => b.status === 'completed' && !b.review).length;
    const completed = bookings.filter((b) => b.status === 'completed').length;
    return { active, needsPay, needsConfirm, needsReview, completed, total: bookings.length };
  }, [bookings]);

  const attentionItems = useMemo(() => {
    const items: { id: string; title: string; href: string; tone: string }[] = [];
    if (stats.needsPay > 0) {
      items.push({
        id: 'pay',
        title: `${stats.needsPay} booking${stats.needsPay > 1 ? 's' : ''} waiting for escrow payment`,
        href: '/user/bookings',
        tone: 'border-amber-200 bg-amber-50 text-amber-900',
      });
    }
    if (stats.needsConfirm > 0) {
      items.push({
        id: 'confirm',
        title: `${stats.needsConfirm} job${stats.needsConfirm > 1 ? 's' : ''} ready for you to confirm`,
        href: '/user/bookings',
        tone: 'border-primary/20 bg-primary/5 text-foreground',
      });
    }
    if (stats.needsReview > 0) {
      items.push({
        id: 'review',
        title: `${stats.needsReview} completed job${stats.needsReview > 1 ? 's' : ''} need a review`,
        href: '/user/bookings',
        tone: 'border-border bg-card text-foreground',
      });
    }
    return items;
  }, [stats]);

  const recent = bookings.slice(0, 4);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Service User
          </p>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Hello{name ? `, ${name}` : ''}
          </h1>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Find verified artisans, book a job, and pay safely through Fixora escrow.
          </p>
        </div>
        <Link
          href="/user/search"
          className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-full text-xs font-bold uppercase tracking-widest min-h-[44px]"
        >
          <Icon name="MagnifyingGlassIcon" size={16} />
          Find an artisan
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Active jobs', value: stats.active, icon: 'BriefcaseIcon' },
          { label: 'Awaiting payment', value: stats.needsPay, icon: 'BanknotesIcon' },
          { label: 'To confirm', value: stats.needsConfirm, icon: 'CheckBadgeIcon' },
          { label: 'Completed', value: stats.completed, icon: 'StarIcon' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-border bg-card p-4 sm:p-5 relative overflow-hidden">
            <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-primary/5" />
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Icon name={stat.icon} size={18} />
            </div>
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-1.5 text-2xl font-extrabold text-foreground">
              {loading ? '…' : stat.value}
            </p>
          </div>
        ))}
      </div>

      {attentionItems.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Needs attention
          </h2>
          {attentionItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${item.tone}`}
            >
              <span>{item.title}</span>
              <Icon name="ChevronRightIcon" size={16} />
            </Link>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-foreground mb-3">What do you need?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TRADES.map((t) => (
            <Link
              key={t.trade}
              href={`/user/search?trade=${encodeURIComponent(t.trade)}`}
              className="rounded-3xl border border-border bg-card p-4 hover:border-primary/40 transition-colors text-center"
            >
              <div className="w-10 h-10 mx-auto rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center mb-2">
                <Icon name={t.icon} size={18} />
              </div>
              <p className="text-sm font-semibold text-foreground">{t.label}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          {
            href: '/user/search',
            title: 'Find an artisan',
            desc: 'Search verified trades near you',
            icon: 'MagnifyingGlassIcon',
          },
          {
            href: '/user/bookings',
            title: 'My bookings',
            desc: 'Track escrow and job progress',
            icon: 'CalendarDaysIcon',
          },
          {
            href: '/user/profile',
            title: 'Profile',
            desc: 'Update your account details',
            icon: 'UserCircleIcon',
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-3xl border border-border bg-card p-5 hover:border-primary/40 transition-colors group"
          >
            <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Icon name={item.icon} size={18} />
            </div>
            <h3 className="font-bold text-foreground">{item.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
          </Link>
        ))}
      </div>

      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Recent bookings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Your latest job requests</p>
          </div>
          <Link href="/user/bookings" className="text-xs font-bold uppercase tracking-widest text-primary">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No bookings yet. Start by finding an artisan.</p>
            <Link
              href="/user/search"
              className="inline-flex mt-4 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"
            >
              Browse artisans
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((b) => (
              <li key={b.id} className="py-3.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {b.service?.title || 'Custom job'} · {b.artisan.user.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {formatDate(b.createdAt)}
                    {b.location ? ` · ${b.location}` : ''}
                    {b.payment ? ` · ${formatGhs(Number(b.payment.amount))}` : ''}
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

      <div className="rounded-3xl bg-secondary text-secondary-foreground p-6 sm:p-8">
        <h2 className="text-lg font-bold">How Fixora works</h2>
        <ol className="mt-4 grid sm:grid-cols-2 gap-3 text-sm text-secondary-foreground/75 list-decimal list-inside">
          <li>Pick a trade or search for a verified artisan nearby.</li>
          <li>Request a booking and agree on the job details.</li>
          <li>Pay into escrow — funds stay held until you confirm.</li>
          <li>Leave a review so others can trust the artisan.</li>
        </ol>
      </div>
    </div>
  );
}
