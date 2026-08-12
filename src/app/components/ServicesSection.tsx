'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

const FALLBACK_TRADES = [
  { trade: 'plumber', icon: 'WrenchScrewdriverIcon', blurb: 'Leaks, drains, and pipe fixes' },
  { trade: 'electrician', icon: 'BoltIcon', blurb: 'Outlets, fixtures, and wiring' },
  { trade: 'carpenter', icon: 'HomeModernIcon', blurb: 'Doors, shelves, and woodwork' },
  { trade: 'painter', icon: 'PaintBrushIcon', blurb: 'Rooms, trim, and touch-ups' },
  { trade: 'cleaner', icon: 'SparklesIcon', blurb: 'Deep cleans and home refresh' },
  { trade: 'ac', icon: 'CpuChipIcon', blurb: 'AC install, service, and repair' },
];

function titleCase(trade: string) {
  return trade.charAt(0).toUpperCase() + trade.slice(1);
}

function iconFor(trade: string) {
  const found = FALLBACK_TRADES.find((t) => t.trade === trade.toLowerCase());
  return found?.icon || 'WrenchIcon';
}

function blurbFor(trade: string) {
  const found = FALLBACK_TRADES.find((t) => t.trade === trade.toLowerCase());
  return found?.blurb || 'Verified Fixora artisans ready to help';
}

export default function ServicesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [trades, setTrades] = useState<{ trade: string; count: number }[]>([]);

  useEffect(() => {
    fetch('/api/public/stats')
      .then((r) => r.json())
      .then((data) => setTrades(data.trades || []))
      .catch(() => setTrades([]));
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
  }, [trades]);

  const cards =
    trades.length > 0
      ? trades.map((t) => ({
          trade: t.trade,
          count: t.count,
          icon: iconFor(t.trade),
          blurb: blurbFor(t.trade),
        }))
      : FALLBACK_TRADES.map((t) => ({ ...t, count: 0 }));

  return (
    <section id="services" ref={sectionRef} className="bg-background py-12 sm:py-20 px-5 sm:px-6 md:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 sm:mb-14 gap-4 sm:gap-6 reveal">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full border border-border text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">
              Live trades on Fixora
            </span>
            <h2 className="text-section-lg font-extrabold text-foreground max-w-lg">
              Every repair.
              <br />
              <span className="text-muted-foreground">Verified artisans.</span>
            </h2>
          </div>
          <p className="text-muted-foreground text-lg font-light max-w-sm leading-relaxed">
            Categories update from real approved artisans on the platform — book with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {cards.map((card, i) => (
            <Link
              key={card.trade}
              href={`/signup`}
              className={`reveal group rounded-3xl border border-border bg-card p-6 hover:border-primary/40 transition-colors ${
                i === 1 ? 'reveal-delay-100' : i === 2 ? 'reveal-delay-200' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon name={card.icon} size={22} />
                </div>
                {card.count > 0 && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                    {card.count} live
                  </span>
                )}
              </div>
              <h3 className="mt-5 text-xl font-bold text-foreground">{titleCase(card.trade)}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{card.blurb}</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 reveal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-3xl bg-secondary text-secondary-foreground p-6 sm:p-8">
          <div>
            <h3 className="text-lg font-bold">Ready to book?</h3>
            <p className="text-sm text-secondary-foreground/70 mt-1">
              Create a free account and find a verified artisan near you.
            </p>
          </div>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest"
          >
            Create account
            <Icon name="ArrowRightIcon" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
