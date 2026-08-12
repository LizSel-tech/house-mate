'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

type PublicStats = {
  jobsCompleted: number;
  artisansApproved: number;
  averageRating: number | null;
  reviewCount: number;
};

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k+`;
  return String(n);
}

export default function HeroSection() {
  const [stats, setStats] = useState<PublicStats | null>(null);

  useEffect(() => {
    fetch('/api/public/stats')
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null));
  }, []);

  const ratingLabel =
    stats?.averageRating != null
      ? String(stats.averageRating)
      : '—';
  const reviewLabel =
    stats && stats.reviewCount > 0
      ? `(${stats.reviewCount} review${stats.reviewCount === 1 ? '' : 's'})`
      : '(new on Fixora)';

  return (
    <section
      id="home"
      className="relative w-full min-h-screen bg-secondary overflow-hidden"
      style={{ minHeight: '100svh' }}
    >
      <div className="absolute inset-0 animate-enter" style={{ animationDuration: '1.2s' }}>
        <AppImage
          src="https://img.rocket.new/generatedImages/rocket_gen_img_1b99a65dd-1779788894920.png"
          alt="Skilled artisan working in a modern home"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-transparent to-transparent" />
      </div>

      <div
        className="absolute top-1/3 right-1/4 w-64 h-64 sm:w-96 sm:h-96 blob-primary animate-float pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 flex flex-col justify-end min-h-[100svh] pb-10 pt-28 sm:pb-16 sm:pt-32 px-5 sm:px-6 md:px-12 lg:px-20 max-w-7xl mx-auto w-full">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-8 animate-enter delay-100">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white text-secondary px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-lg">
            <Icon name="StarIcon" variant="solid" size={14} className="text-primary shrink-0" />
            <span>{ratingLabel}</span>
            <span className="text-muted-foreground font-medium">{reviewLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 glass-panel text-white px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span>Ghana · Verified artisans</span>
          </div>
          <div className="glass-panel text-white px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium">
            Escrow-protected bookings
          </div>
        </div>

        <h1 className="text-hero-xl font-extrabold text-white max-w-4xl mb-4 sm:mb-6 animate-enter delay-200">
          Your Home,
          <br />
          Fixed Right.
          <br />
          <span className="text-primary">With Fixora.</span>
        </h1>

        <p className="text-white/75 text-base sm:text-lg md:text-xl font-light max-w-xl leading-relaxed mb-8 sm:mb-10 animate-enter delay-300">
          Book verified artisans across Ghana — plumbing, electrical, carpentry, painting, and more.
          Pay into escrow until the job is done.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto animate-enter delay-500">
          <Link
            href="/signup"
            className="group flex items-center justify-between sm:justify-start gap-3 bg-primary text-primary-foreground pl-6 sm:pl-8 pr-2 py-3 sm:py-2.5 rounded-full font-bold text-sm hover:bg-accent transition-colors duration-300 min-h-[48px]"
          >
            Get started
            <span className="bg-secondary text-white p-2 rounded-full transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
              <Icon name="ArrowUpRightIcon" size={16} />
            </span>
          </Link>
          <Link
            href="/login"
            className="group flex items-center justify-between sm:justify-start gap-3 glass-panel text-white pl-6 sm:pl-8 pr-2 py-3 sm:py-2.5 rounded-full font-medium text-sm hover:bg-white/20 transition-colors duration-300 min-h-[48px]"
          >
            Log in
            <span className="bg-primary text-white p-2 rounded-full">
              <Icon name="ArrowRightIcon" size={16} />
            </span>
          </Link>
        </div>

        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/10 grid grid-cols-3 gap-3 sm:flex sm:flex-wrap sm:gap-8 animate-enter delay-700">
          {[
            {
              value: stats ? formatCount(stats.jobsCompleted) : '…',
              label: 'Jobs completed',
            },
            {
              value: stats ? formatCount(stats.artisansApproved) : '…',
              label: 'Verified artisans',
            },
            {
              value: stats?.averageRating != null ? `${stats.averageRating}★` : 'New',
              label: 'Avg rating',
            },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-xl sm:text-2xl font-extrabold text-white">{stat.value}</p>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest text-white/50 mt-0.5 leading-tight">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
