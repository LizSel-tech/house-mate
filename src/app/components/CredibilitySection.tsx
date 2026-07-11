'use client';

import React, { useEffect, useRef } from 'react';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

const stats = [
  { value: '1,200+', label: 'Jobs Completed', icon: 'CheckBadgeIcon' },
  { value: '12 yrs', label: 'In Business', icon: 'CalendarDaysIcon' },
  { value: '4.9★', label: 'Average Rating', icon: 'StarIcon' },
  { value: '$0', label: 'Call-Out Fee', icon: 'CurrencyDollarIcon' },
];

const testimonials = [
  {
    quote: "Marcus fixed our bathroom faucet and patched two drywall holes in under 2 hours. Showed up on time, cleaned up after himself, and charged exactly what he quoted. Already booked him for the deck.",
    name: 'Jennifer Caldwell',
    role: 'Homeowner, SE Portland',
    avatar: 'https://i.pravatar.cc/100?u=jennifer-caldwell-pdx',
  },
  {
    quote: "I had three different contractors ghost me before finding HandyPro. Marcus responded within the hour, came the next morning, and replaced our entire kitchen light fixture and two outlets. Absolute professional.",
    name: 'David Okonkwo',
    role: 'Homeowner, Beaverton',
    avatar: 'https://i.pravatar.cc/100?u=david-okonkwo-bvtn',
  },
  {
    quote: "We hired HandyPro to repaint our living room and fix a squeaky stair. The painting is flawless — you can\'t tell where the old color was. The stair hasn\'t made a sound since. Worth every cent.",
    name: 'Sarah Nguyen',
    role: 'Homeowner, Lake Oswego',
    avatar: 'https://i.pravatar.cc/100?u=sarah-nguyen-lo',
  },
];

export default function CredibilitySection() {
  const sectionRef = useRef<HTMLDivElement>(null);

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
  }, []);

  return (
    <section id="about" ref={sectionRef} className="bg-secondary py-20 px-6 md:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-16 reveal">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="bg-white/5 border border-white/10 rounded-4xl p-6 flex flex-col items-start gap-3 hover:border-primary/40 transition-colors duration-300"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                <Icon name={stat.icon as any} size={20} />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-white">{stat.value}</p>
                <p className="text-xs font-bold uppercase tracking-widest text-white/40 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Section Header */}
        <div className="grid md:grid-cols-2 items-end gap-8 mb-12 reveal">
          <h2 className="text-section-lg font-extrabold text-white">
            What Portland<br />
            <span className="text-white/40">homeowners say.</span>
          </h2>
          <p className="text-white/50 text-lg font-light leading-relaxed">
            Real reviews from real neighbors. No bots, no incentives — just honest feedback from jobs HandyPro has completed.
          </p>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`reveal ${i === 1 ? 'reveal-delay-200' : i === 2 ? 'reveal-delay-400' : ''} card-glow`}
            >
              <div className="bg-white/5 border border-white/10 rounded-4xl p-8 flex flex-col justify-between min-h-[280px] hover:border-primary/30 transition-colors duration-300 h-full">
                {/* Quote icon */}
                <div className="mb-5">
                  <Icon name="ChatBubbleLeftEllipsisIcon" size={28} className="text-primary/60" />
                </div>
                <p className="text-white/75 text-sm leading-relaxed flex-1 mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-5 border-t border-white/10">
                  <AppImage
                    src={t.avatar}
                    alt={`${t.name} profile photo`}
                    width={44}
                    height={44}
                    className="rounded-full object-cover ring-2 ring-primary/30"
                  />
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs text-white/40 font-medium mt-0.5">{t.role}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}