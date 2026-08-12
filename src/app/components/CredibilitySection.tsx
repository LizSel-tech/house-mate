'use client';

import React, { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

type PublicStats = {
  jobsCompleted: number;
  artisansApproved: number;
  customers: number;
  averageRating: number | null;
  reviewCount: number;
};

type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  name: string;
  location: string | null;
  artisanName: string;
  trade: string;
};

function formatCount(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k+`;
  return String(n);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export default function CredibilitySection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/public/stats').then((r) => r.json()),
      fetch('/api/public/reviews').then((r) => r.json()),
    ])
      .then(([s, r]) => {
        setStats(s);
        setReviews(r.reviews || []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    const elements = sectionRef.current?.querySelectorAll('.reveal');
    elements?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reviews, stats]);

  const displayStats = [
    {
      value: stats ? formatCount(stats.jobsCompleted) : '…',
      label: 'Jobs completed',
      icon: 'CheckBadgeIcon',
    },
    {
      value: stats ? formatCount(stats.artisansApproved) : '…',
      label: 'Verified artisans',
      icon: 'WrenchScrewdriverIcon',
    },
    {
      value:
        stats?.averageRating != null ? `${stats.averageRating}★` : stats ? 'New' : '…',
      label: 'Average rating',
      icon: 'StarIcon',
    },
    {
      value: stats ? formatCount(stats.customers) : '…',
      label: 'Customers',
      icon: 'UsersIcon',
    },
  ];

  return (
    <section id="about" ref={sectionRef} className="bg-secondary py-12 sm:py-20 px-5 sm:px-6 md:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5 mb-12 sm:mb-16 reveal">
          {displayStats.map((stat, i) => (
            <div
              key={stat.label}
              className="bg-white/5 border border-white/10 rounded-3xl sm:rounded-4xl p-4 sm:p-6 flex flex-col items-start gap-2 sm:gap-3 hover:border-primary/40 transition-colors duration-300"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                <Icon name={stat.icon} size={20} />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-white">{stat.value}</p>
                <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest text-white/40 mt-0.5 leading-tight">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 items-end gap-8 mb-12 reveal">
          <h2 className="text-section-lg font-extrabold text-white">
            What Ghana
            <br />
            <span className="text-white/40">customers say.</span>
          </h2>
          <p className="text-white/50 text-lg font-light leading-relaxed">
            Live reviews from Fixora bookings — honest feedback after escrow is released.
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="reveal rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10 text-center">
            <Icon name="ChatBubbleLeftEllipsisIcon" size={28} className="text-primary/60 mx-auto mb-4" />
            <p className="text-white font-bold text-lg">Be the first to leave a review</p>
            <p className="text-white/50 text-sm mt-2 max-w-md mx-auto">
              As customers complete jobs on Fixora, real ratings and comments will appear here.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-5">
            {reviews.slice(0, 3).map((t, i) => (
              <div
                key={t.id}
                className={`reveal ${i === 1 ? 'reveal-delay-200' : i === 2 ? 'reveal-delay-400' : ''} card-glow`}
              >
                <div className="bg-white/5 border border-white/10 rounded-4xl p-6 sm:p-8 flex flex-col justify-between min-h-[240px] sm:min-h-[280px] hover:border-primary/30 transition-colors duration-300 h-full">
                  <div className="mb-5 flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, star) => (
                      <Icon
                        key={star}
                        name="StarIcon"
                        variant={star < t.rating ? 'solid' : 'outline'}
                        size={16}
                        className={star < t.rating ? 'text-primary' : 'text-white/20'}
                      />
                    ))}
                  </div>
                  <p className="text-white/75 text-sm leading-relaxed flex-1 mb-6">
                    &ldquo;{t.comment}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-5 border-t border-white/10">
                    <div className="w-11 h-11 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold ring-2 ring-primary/30">
                      {initials(t.name) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{t.name}</p>
                      <p className="text-xs text-white/40 font-medium mt-0.5">
                        {t.location || 'Ghana'} · {t.trade} · {t.artisanName}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
