'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import Pagination, { usePagination } from '@/components/ui/Pagination';
import { useImageError } from '@/components/ui/useImageError';
import { AdminPageHeader, EmptyState, KpiCard, formatDateTime } from '@/components/admin/AdminUI';

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  clientName: string;
  clientAvatarUrl: string | null;
  clientRole: string;
  serviceTitle: string | null;
};

type Summary = {
  averageRating: number;
  total: number;
  breakdown: Record<string, number>;
};

type Filter = 'all' | '5' | '4' | '3' | '2' | '1';

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="StarIcon"
          variant={n <= Math.round(rating) ? 'solid' : 'outline'}
          size={size}
          className={n <= Math.round(rating) ? 'text-amber-500' : 'text-muted-foreground/40'}
        />
      ))}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

function ClientAvatar({ name, src }: { name: string; src: string | null }) {
  const [showImage, onError] = useImageError(src);
  return showImage && src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" onError={onError} className="w-10 h-10 rounded-xl object-cover shrink-0" />
  ) : (
    <div className="w-10 h-10 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold shrink-0">
      {initials(name) || '?'}
    </div>
  );
}

export default function ProviderReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<Summary>({ averageRating: 0, total: 0, breakdown: {} });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/provider/reviews');
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setReviews(data.reviews || []);
          setSummary(data.summary);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visible = useMemo(
    () => (filter === 'all' ? reviews : reviews.filter((r) => String(r.rating) === filter)),
    [reviews, filter],
  );
  const pager = usePagination(visible, { resetKey: filter });

  const fiveStarShare = summary.total
    ? Math.round(((summary.breakdown['5'] || 0) / summary.total) * 100)
    : 0;
  const withComments = reviews.filter((r) => r.comment && r.comment.trim()).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Reputation"
        title="My reviews"
        description="Ratings and feedback from clients you have completed jobs for."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Average rating"
          value={loading ? '…' : summary.total ? `${summary.averageRating.toFixed(1)} ★` : '—'}
          hint={summary.total ? 'Across all reviews' : 'No reviews yet'}
          icon="StarIcon"
        />
        <KpiCard label="Total reviews" value={loading ? '…' : String(summary.total)} hint="From completed jobs" icon="ChatBubbleBottomCenterTextIcon" />
        <KpiCard label="5-star share" value={loading ? '…' : `${fiveStarShare}%`} hint="Of all reviews" icon="SparklesIcon" />
        <KpiCard label="With comments" value={loading ? '…' : String(withComments)} hint="Written feedback" icon="PencilSquareIcon" />
      </div>

      <div className="grid lg:grid-cols-[18rem_1fr] gap-5 items-start">
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Rating breakdown</p>
          <div className="mt-3 flex items-end gap-3">
            <p className="text-4xl font-extrabold text-foreground tabular-nums">
              {summary.total ? summary.averageRating.toFixed(1) : '—'}
            </p>
            <div className="pb-1.5">
              <Stars rating={summary.averageRating} />
              <p className="text-xs text-muted-foreground mt-0.5">
                {summary.total} review{summary.total === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = summary.breakdown[String(star)] || 0;
              const pct = summary.total ? (count / summary.total) * 100 : 0;
              const active = filter === String(star);
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFilter(active ? 'all' : (String(star) as Filter))}
                  className={`w-full flex items-center gap-2 rounded-lg px-1.5 py-1 text-xs transition-colors ${
                    active ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                >
                  <span className="w-6 font-semibold text-foreground tabular-nums">{star}★</span>
                  <span className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <span className="block h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-6 text-right text-muted-foreground tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 min-w-0">
          <div className="flex flex-wrap gap-2">
            {(['all', '5', '4', '3', '2', '1'] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-colors ${
                  filter === f
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' ? `All (${summary.total})` : `${f}★ (${summary.breakdown[f] || 0})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="h-48 rounded-2xl border border-border bg-card animate-pulse" />
          ) : visible.length === 0 ? (
            <EmptyState
              icon="StarIcon"
              title={filter === 'all' ? 'No reviews yet' : `No ${filter}-star reviews`}
              description="Clients can review you after they confirm a completed job and the payment is released."
            />
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <ul className="divide-y divide-border">
                {pager.pageItems.map((r) => (
                  <li key={r.id} className="px-4 sm:px-5 py-4 flex items-start gap-3">
                    <ClientAvatar name={r.clientName} src={r.clientAvatarUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-foreground text-sm">
                          {r.clientName}
                          {r.clientRole === 'artisan' && (
                            <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              Provider
                            </span>
                          )}
                        </p>
                        <Stars rating={r.rating} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.serviceTitle || 'Custom job'} · {formatDateTime(r.createdAt)}
                      </p>
                      {r.comment?.trim() ? (
                        <p className="text-sm text-foreground/90 mt-2 leading-relaxed">{r.comment}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic mt-2">No written comment.</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination {...pager.props} label="reviews" />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
