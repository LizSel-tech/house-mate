'use client';

import React, { useEffect, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

const steps = [
  {
    number: '01',
    title: 'Book an artisan',
    description:
      'Tell us what needs fixing — plumbing, electrical, carpentry, and more. Pick a verified Fixora pro near you.',
    icon: 'ChatBubbleBottomCenterTextIcon',
  },
  {
    number: '02',
    title: 'They come to your home',
    description:
      'Your artisan arrives on time with the right tools. Upfront pricing, no surprises on the invoice.',
    icon: 'WrenchScrewdriverIcon',
  },
  {
    number: '03',
    title: 'Confirm when it’s done',
    description:
      'They finish the job, clean up, and you confirm. Most Ghana homes are sorted within 24 hours.',
    icon: 'CheckBadgeIcon',
  },
];


export default function HowItWorksSection() {
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
    <section id="how-it-works" ref={sectionRef} className="bg-background pt-12 pb-16 sm:pt-16 sm:pb-20 px-5 sm:px-6 md:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto">

        {/* Asymmetric layout: 60/40 */}
        <div className="grid lg:grid-cols-5 gap-12 items-start">

          {/* Left: Steps — 3 cols */}
          <div className="lg:col-span-3 flex flex-col gap-8">
            <div className="reveal">
              <span className="inline-block px-4 py-1.5 rounded-full border border-border text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">
                The Process
              </span>
              <h2 className="text-section-lg font-extrabold text-foreground mb-4">
                Simple from start<br />
                <span className="text-muted-foreground">to finish.</span>
              </h2>
              <p className="text-muted-foreground text-lg font-light leading-relaxed max-w-md">
                Three steps. Zero stress. Most jobs are booked and completed within 24 hours.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              {steps.map((step, i) =>
              <div
                key={step.number}
                className={`reveal ${i === 1 ? 'reveal-delay-200' : i === 2 ? 'reveal-delay-400' : ''} card-glow`}>
                
                  <div className="bg-card border border-border rounded-4xl p-6 sm:p-8 flex gap-4 sm:gap-5 items-start hover:border-primary/40 hover:shadow-md transition-all duration-300">
                    <div className="shrink-0">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Icon name={step.icon} size={22} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-black text-primary/60 tracking-widest">{step.number}</span>
                        <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Sticky companion card — 2 cols */}
          <div className="lg:col-span-2 flex flex-col gap-5 lg:sticky lg:top-28">

            {/* Photo card */}
            <div className="reveal reveal-delay-200 card-glow">
              <div className="relative rounded-4xl overflow-hidden aspect-[4/3] group border border-border">
                <AppImage
                  src="https://img.rocket.new/generatedImages/rocket_gen_img_15a660b40-1780061457324.png"
                  alt="Handyman working on wooden shelving in a bright living room, warm afternoon light, professional craftsmanship"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 1024px) 100vw, 40vw" />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                {/* Floating badge */}
                <div className="absolute bottom-5 left-5 right-5">
                  <div className="glass-panel rounded-2xl px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-bold">Same-Day Available</p>
                      <p className="text-white/60 text-xs mt-0.5">Most repairs done in 1–3 hrs</p>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                      <Icon name="ClockIcon" size={16} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Guarantee card */}
            <div className="reveal reveal-delay-300 card-glow">
              <div className="bg-primary rounded-4xl p-7 flex flex-col gap-4 diagonal-rays">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-white">
                  <Icon name="ShieldCheckIcon" size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">100% Satisfaction Guarantee</h3>
                  <p className="text-white/75 text-sm leading-relaxed">
                    If you&apos;re not happy with the work, we come back and fix it — no charge. That&apos;s our promise to every Ghana household.
                  </p>
                </div>
                <a
                  href="#contact"
                  className="group flex items-center gap-2 text-white/90 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">
                  
                  Book with confidence
                  <Icon name="ArrowRightIcon" size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>);

}