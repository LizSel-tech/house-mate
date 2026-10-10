'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

import { SERVICE_CATEGORIES, categoryIcon, categoryLabel, findCategory } from '@/lib/categories';

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

  const liveCount = (trade: string) =>
    trades
      .filter((t) => findCategory(t.trade)?.trade === trade)
      .reduce((sum, t) => sum + Number(t.count || 0), 0);
  const cards = [
    ...SERVICE_CATEGORIES.map((c) => ({
      trade: c.trade,
      label: c.label,
      icon: c.icon,
      blurb: c.blurb,
      count: liveCount(c.trade),
    })),
    ...trades
      .filter((t) => !findCategory(t.trade))
      .map((t) => ({
        trade: t.trade,
        label: categoryLabel(t.trade),
        icon: categoryIcon(t.trade),
        blurb: 'Verified Craftviva service providers ready to help',
        count: Number(t.count || 0),
      })),
  ].sort((a, b) => b.count - a.count);

  return (
    <section id="services" ref={sectionRef} className="bg-background py-12 sm:py-20 px-5 sm:px-6 md:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 sm:mb-14 gap-4 sm:gap-6 reveal">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full border border-border text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">
              Live trades on Craftviva
            </span>
            <h2 className="text-section-lg font-extrabold text-foreground max-w-lg">
              Every service.
              <br />
              <span className="text-muted-foreground">Verified service providers.</span>
            </h2>
          </div>
          <p className="text-muted-foreground text-lg font-light max-w-sm leading-relaxed">
            From home repairs to dressmaking, hair, and catering — every provider is verified before they can take bookings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {cards.map((card, i) => (
            <Link
              key={card.trade}
              href={`/signup`}
              className={`reveal group rounded-4xl border border-border bg-card p-6 sm:p-7 shadow-sm hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${
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
              <h3 className="mt-5 text-xl font-bold text-foreground">{card.label}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{card.blurb}</p>
            </Link>
          ))}
        </div>

        <div className="mt-10 reveal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-4xl bg-secondary text-secondary-foreground p-6 sm:p-8">
          <div>
            <h3 className="text-lg font-bold">Ready to book?</h3>
            <p className="text-sm text-secondary-foreground/70 mt-1">
              Create a free account and find a verified service provider near you.
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
