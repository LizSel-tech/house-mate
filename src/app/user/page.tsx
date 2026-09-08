'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';

type Booking = {
  id: string;
  status: string;
  location: string | null;
  agreedPrice: string | number | null;
  createdAt: string;
  artisan: { user: { name: string } };
  service: { title: string } | null;
  payment: { escrowStatus: string; amount: string | number } | null;
  review: { id: string } | null;
};

type ArtisanCard = {
  id: string;
  trade: string;
  bio: string | null;
  serviceArea: string | null;
  averageRating: number;
  jobsCompleted: number;
  user: { name: string; location?: string | null; avatarUrl?: string | null };
  services: { id: string; title: string; priceAmount: number; priceUnit: string }[];
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export default function UserHomePage() {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [artisans, setArtisans] = useState<ArtisanCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [meRes, bookRes, artisanRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/bookings'),
          fetch('/api/artisans'),
        ]);
        const me = await meRes.json().catch(() => ({}));
        const bookData = await bookRes.json().catch(() => ({}));
        const artisanData = await artisanRes.json().catch(() => ({}));
        if (meRes.ok && me.user?.name) setName(me.user.name.split(' ')[0] || '');
        if (bookRes.ok) setBookings(bookData.bookings || []);
        if (artisanRes.ok) setArtisans(artisanData.artisans || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const active = bookings.filter((b) =>
      ['requested', 'accepted', 'in_progress'].includes(b.status),
    ).length;
    const needsPay = bookings.filter(
      (b) => ['accepted', 'in_progress'].includes(b.status) && !b.payment,
    ).length;
    const needsConfirm = bookings.filter(
      (b) => b.status === 'in_progress' && b.payment?.escrowStatus === 'held',
    ).length;
    const needsReview = bookings.filter((b) => b.status === 'completed' && !b.review).length;
    return { active, needsPay, needsConfirm, needsReview };
  }, [bookings]);

  const featured = artisans.slice(0, 6);
  const recent = bookings.slice(0, 4);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    window.location.href = q
      ? `/user/search?q=${encodeURIComponent(q)}`
      : '/user/search';
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="bg-[radial-gradient(ellipse_at_top_right,_rgba(217,119,6,0.14),_transparent_55%)] px-5 sm:px-8 py-7 sm:py-9">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Home
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Hello{name ? `, ${name}` : ''}
          </h1>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Browse verified artisans, book a job, and pay safely through Fixora escrow.
          </p>
          <form onSubmit={onSearch} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Icon
                name="MagnifyingGlassIcon"
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search plumber, electrician, painter…"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <Button type="submit" className="!rounded-xl !min-h-[48px] sm:!px-6">
              Search
            </Button>
          </form>
        </div>
      </section>

      {(stats.needsPay > 0 || stats.needsConfirm > 0 || stats.needsReview > 0 || stats.active > 0) && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Active jobs', value: stats.active, href: '/user/bookings', icon: 'BriefcaseIcon' },
            { label: 'Awaiting payment', value: stats.needsPay, href: '/user/bookings', icon: 'BanknotesIcon' },
            { label: 'To confirm', value: stats.needsConfirm, href: '/user/bookings', icon: 'CheckBadgeIcon' },
            { label: 'Need review', value: stats.needsReview, href: '/user/bookings', icon: 'StarIcon' },
          ]
            .filter((s) => s.value > 0 || s.label === 'Active jobs')
            .slice(0, 4)
            .map((stat) => (
              <Link
                key={stat.label}
                href={stat.href}
                className="rounded-2xl border border-border bg-card px-4 py-3.5 flex items-center gap-3 hover:border-primary/35 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon name={stat.icon} size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="text-xl font-extrabold text-foreground tabular-nums">
                    {loading ? '…' : stat.value}
                  </p>
                </div>
              </Link>
            ))}
        </div>
      )}

      <section>
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Shop by trade</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Pick a category to find verified help nearby</p>
          </div>
          <Link href="/user/search" className="text-xs font-bold uppercase tracking-widest text-primary">
            Browse all
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TRADES.map((t) => (
            <Link
              key={t.trade}
              href={`/user/search?trade=${encodeURIComponent(t.trade)}`}
              className="group rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all text-center"
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-secondary text-secondary-foreground flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon name={t.icon} size={20} />
              </div>
              <p className="text-sm font-semibold text-foreground">{t.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Featured artisans</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Top-rated verified providers</p>
          </div>
          <Link href="/user/search" className="text-xs font-bold uppercase tracking-widest text-primary">
            See more
          </Link>
        </div>
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">No verified artisans listed yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((a) => {
              const from = a.services[0]?.priceAmount;
              return (
                <Link
                  key={a.id}
                  href={`/user/artisans/${a.id}`}
                  className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/35 hover:shadow-sm transition-all group"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      {a.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.user.avatarUrl}
                          alt=""
                          className="w-12 h-12 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                          {initials(a.user.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {a.user.name}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize mt-0.5">
                          {a.trade}
                          {a.serviceArea ? ` · ${a.serviceArea}` : ''}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                      {a.bio || 'Verified Fixora artisan ready to help with your home job.'}
                    </p>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-bold text-foreground">{a.averageRating.toFixed(1)}</span> ★ ·{' '}
                        {a.jobsCompleted} jobs
                      </p>
                      <p className="text-sm font-bold text-foreground">
                        {from != null ? `From ${formatGhs(from)}` : 'View rates'}
                      </p>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-border bg-muted/20 text-xs font-bold uppercase tracking-widest text-primary">
                    View profile
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Recent bookings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Track escrow and job progress</p>
          </div>
          <Link href="/user/bookings" className="text-xs font-bold uppercase tracking-widest text-primary">
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
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">No bookings yet. Start by finding an artisan.</p>
              <Link
                href="/user/search"
                className="inline-flex mt-4 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest"
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
      </section>
    </div>
  );
}
