'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { SERVICE_CATEGORIES, categoryLabel } from '@/lib/categories';
import { usePortalPaths } from '@/components/marketplace/usePortalPaths';

type Artisan = {
  id: string;
  trade: string;
  bio: string | null;
  serviceArea: string | null;
  averageRating: number;
  jobsCompleted: number;
  user: { name: string; avatarUrl?: string | null };
  services: { id: string; title: string; priceAmount: number; priceUnit: string }[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export default function ProviderSearch() {
  const paths = usePortalPaths();
  const [q, setQ] = useState('');
  const [trade, setTrade] = useState('');
  const [area, setArea] = useState('');
  const [artisans, setArtisans] = useState<Artisan[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (e?: FormEvent, tradeOverride?: string, qOverride?: string) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const qValue = qOverride ?? q;
      if (qValue) params.set('q', qValue);
      const tradeValue = tradeOverride ?? trade;
      if (tradeValue) params.set('trade', tradeValue);
      if (area) params.set('area', area);
      const res = await fetch(`/api/artisans?${params.toString()}`);
      const data = await res.json();
      setArtisans(data.artisans || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get('trade') || '';
    const qFromUrl = urlParams.get('q') || '';
    if (fromUrl) setTrade(fromUrl);
    if (qFromUrl) setQ(qFromUrl);
    void search(undefined, fromUrl, qFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Marketplace</p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Find service providers
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Browse verified service providers by category and location.
        </p>
      </div>

      <form
        onSubmit={search}
        className="rounded-2xl border border-border bg-card p-4 sm:p-5 grid sm:grid-cols-4 gap-3"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search services or names"
          className="sm:col-span-2 px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Select
          value={trade}
          onChange={(value) => {
            setTrade(value);
            void search(undefined, value);
          }}
          placeholder="All categories"
          options={[
            { value: '', label: 'All categories' },
            ...SERVICE_CATEGORIES.map((c) => ({ value: c.trade, label: c.label })),
          ]}
        />
        <input
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Area (e.g. Accra)"
          className="px-4 py-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" loading={loading} className="sm:col-span-4 w-full sm:w-auto justify-self-start !rounded-xl">
          Search
        </Button>
      </form>

      {artisans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Icon name="MagnifyingGlassIcon" size={28} className="mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground">No verified service providers found</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            Providers must complete KYC and be approved before they appear here.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {artisans.map((artisan) => {
            const fromPrice =
              artisan.services.length > 0
                ? Math.min(...artisan.services.map((s) => s.priceAmount))
                : null;
            return (
              <Link
                key={artisan.id}
                href={paths.provider(artisan.id)}
                className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-sm transition-all group"
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    {artisan.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={artisan.user.avatarUrl}
                        alt=""
                        className="w-12 h-12 rounded-xl object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                        {initials(artisan.user.name) || '?'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-base font-bold text-foreground truncate group-hover:text-primary transition-colors">
                          {artisan.user.name}
                        </p>
                        <p className="text-sm font-bold text-primary shrink-0">
                          {Number(artisan.averageRating || 0).toFixed(1)}★
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {categoryLabel(artisan.trade)} · {artisan.serviceArea || 'Service area TBD'}
                      </p>
                    </div>
                  </div>
                  {artisan.bio && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{artisan.bio}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="px-2.5 py-1 rounded-full bg-muted font-semibold">
                      {artisan.jobsCompleted} jobs
                    </span>
                    {fromPrice != null && (
                      <span className="px-2.5 py-1 rounded-full bg-muted font-semibold">
                        from GHS {fromPrice.toFixed(2)}
                      </span>
                    )}
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
    </div>
  );
}
