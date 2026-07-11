'use client';

import React, { useEffect, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

const services = [
{
  id: 'plumbing',
  title: 'Plumbing Repairs',
  description: 'Leaky faucets, running toilets, pipe fixes, and drain clogs cleared fast — no water damage waiting.',
  icon: 'WrenchScrewdriverIcon',
  tag: 'Most Requested',
  colSpan: 'lg:col-span-3',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_1446972ad-1772065301457.png",
  imageAlt: 'Plumber fixing pipes under a kitchen sink, bright workshop lighting, close-up of tools and copper pipes',
  dark: true
},
{
  id: 'electrical',
  title: 'Electrical Work',
  description: 'Outlet replacements, light fixture installs, ceiling fans, and switch upgrades by a licensed pro.',
  icon: 'BoltIcon',
  tag: 'Licensed',
  colSpan: 'lg:col-span-3',
  image: "https://img.rocket.new/generatedImages/rocket_gen_img_11840c37b-1772152005966.png",
  imageAlt: 'Electrician installing a light fixture on a white ceiling, warm interior lighting, professional tools',
  dark: true
},
{
  id: 'carpentry',
  title: 'Carpentry & Trim',
  description: 'Shelving, cabinet repairs, door adjustments, baseboards, and custom wood work done with care.',
  icon: 'HomeModernIcon',
  tag: null,
  colSpan: 'lg:col-span-2',
  image: null,
  imageAlt: '',
  dark: false
},
{
  id: 'painting',
  title: 'Interior Painting',
  description: 'Clean lines, zero drips. Rooms, trim, touch-ups, and accent walls that look professionally done.',
  icon: 'PaintBrushIcon',
  tag: null,
  colSpan: 'lg:col-span-2',
  image: null,
  imageAlt: '',
  dark: false
},
{
  id: 'flooring',
  title: 'Flooring & Tile',
  description: 'Hardwood, laminate, tile installation and repair. Grout cleaning and re-sealing included.',
  icon: 'Squares2X2Icon',
  tag: null,
  colSpan: 'lg:col-span-2',
  image: null,
  imageAlt: '',
  dark: false
},
{
  id: 'general',
  title: 'General Home Repairs',
  description: 'Drywall patches, door hardware, weatherstripping, caulking, assembly, and all the small jobs that add up. One call handles it all.',
  icon: 'WrenchIcon',
  tag: 'All-in-One',
  colSpan: 'lg:col-span-6',
  image: null,
  imageAlt: '',
  dark: false,
  wide: true
}];


export default function ServicesSection() {
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
    <section id="services" ref={sectionRef} className="bg-background py-20 px-6 md:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-14 gap-6 reveal">
          <div>
            <span className="inline-block px-4 py-1.5 rounded-full border border-border text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">
              What We Fix
            </span>
            <h2 className="text-section-lg font-extrabold text-foreground max-w-lg">
              Every repair.<br />
              <span className="text-muted-foreground">One trusted pro.</span>
            </h2>
          </div>
          <p className="text-muted-foreground text-lg font-light max-w-sm leading-relaxed reveal reveal-delay-200">
            From a dripping faucet to a full room refresh — HandyPro handles it all so you don&apos;t have to juggle contractors.
          </p>
        </div>

        {/* Bento Grid */}
        {/* 
           BENTO GRID MAP (lg: 6 columns):
           Row 1: [col-1–3: Plumbing cs-3] [col-4–6: Electrical cs-3]
           Row 2: [col-1–2: Carpentry cs-2] [col-3–4: Painting cs-2] [col-5–6: Flooring cs-2]
           Row 3: [col-1–6: General cs-6]
           Placed 6/6 cards ✓
          */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-5">

          {/* Card: Plumbing — col-span-3, with image */}
          {/* col-1–3 */}
          <div className={`lg:col-span-3 reveal card-glow`}>
            <div className="relative bg-secondary rounded-4xl overflow-hidden min-h-[280px] group border border-white/5 flex flex-col justify-between p-8">
              <AppImage
                src={services[0].image!}
                alt={services[0].imageAlt}
                fill
                className="object-cover opacity-30 group-hover:opacity-45 group-hover:scale-105 transition-all duration-700"
                sizes="(max-width: 768px) 100vw, 50vw" />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="relative z-10 flex justify-between items-start">
                <div className="w-11 h-11 rounded-2xl glass-panel-dark flex items-center justify-center text-primary">
                  <Icon name={services[0].icon as any} size={22} />
                </div>
                {services[0].tag &&
                <span className="px-3 py-1 bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-full">
                    {services[0].tag}
                  </span>
                }
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-2">{services[0].title}</h3>
                <p className="text-white/65 text-sm leading-relaxed">{services[0].description}</p>
              </div>
            </div>
          </div>

          {/* Card: Electrical — col-span-3, with image */}
          {/* col-4–6 */}
          <div className={`lg:col-span-3 reveal reveal-delay-100 card-glow`}>
            <div className="relative bg-secondary rounded-4xl overflow-hidden min-h-[280px] group border border-white/5 flex flex-col justify-between p-8">
              <AppImage
                src={services[1].image!}
                alt={services[1].imageAlt}
                fill
                className="object-cover opacity-30 group-hover:opacity-45 group-hover:scale-105 transition-all duration-700"
                sizes="(max-width: 768px) 100vw, 50vw" />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="relative z-10 flex justify-between items-start">
                <div className="w-11 h-11 rounded-2xl glass-panel-dark flex items-center justify-center text-primary">
                  <Icon name={services[1].icon as any} size={22} />
                </div>
                {services[1].tag &&
                <span className="px-3 py-1 bg-primary/90 text-primary-foreground text-xs font-bold uppercase tracking-widest rounded-full">
                    {services[1].tag}
                  </span>
                }
              </div>
              <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-2">{services[1].title}</h3>
                <p className="text-white/65 text-sm leading-relaxed">{services[1].description}</p>
              </div>
            </div>
          </div>

          {/* Card: Carpentry — col-span-2 */}
          {/* col-1–2 */}
          <div className={`lg:col-span-2 reveal reveal-delay-200 card-glow`}>
            <div className="bg-card border border-border rounded-4xl p-7 min-h-[200px] flex flex-col justify-between hover:border-primary/40 transition-colors duration-300 h-full">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                <Icon name={services[2].icon as any} size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">{services[2].title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{services[2].description}</p>
              </div>
            </div>
          </div>

          {/* Card: Painting — col-span-2 */}
          {/* col-3–4 */}
          <div className={`lg:col-span-2 reveal reveal-delay-300 card-glow`}>
            <div className="bg-card border border-border rounded-4xl p-7 min-h-[200px] flex flex-col justify-between hover:border-primary/40 transition-colors duration-300 h-full">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                <Icon name={services[3].icon as any} size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">{services[3].title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{services[3].description}</p>
              </div>
            </div>
          </div>

          {/* Card: Flooring — col-span-2 */}
          {/* col-5–6 */}
          <div className={`lg:col-span-2 reveal reveal-delay-400 card-glow`}>
            <div className="bg-card border border-border rounded-4xl p-7 min-h-[200px] flex flex-col justify-between hover:border-primary/40 transition-colors duration-300 h-full">
              <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5">
                <Icon name={services[4].icon as any} size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-2">{services[4].title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{services[4].description}</p>
              </div>
            </div>
          </div>

          {/* Card: General Repairs — col-span-6, full width */}
          {/* col-1–6 */}
          <div className={`lg:col-span-6 reveal reveal-delay-200 card-glow`}>
            <div className="bg-secondary rounded-4xl p-8 md:p-10 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-primary/30 transition-colors duration-300">
              <div className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Icon name={services[5].icon as any} size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-white">{services[5].title}</h3>
                    <span className="px-3 py-0.5 bg-primary/20 text-primary text-xs font-bold uppercase tracking-widest rounded-full">
                      {services[5].tag}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed max-w-2xl">{services[5].description}</p>
                </div>
              </div>
              <a
                href="#contact"
                className="shrink-0 group flex items-center gap-3 bg-primary text-primary-foreground pl-6 pr-2 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-accent transition-colors duration-300">
                
                Get a Quote
                <span className="bg-secondary text-white p-2 rounded-full transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                  <Icon name="ArrowUpRightIcon" size={14} />
                </span>
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>);

}