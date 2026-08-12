'use client';

import React, { useEffect, useRef, useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface FormState {
  name: string;
  phone: string;
  email: string;
  service: string;
  message: string;
}

const serviceOptions = [
  'Plumbing Repairs',
  'Electrical Work',
  'Carpentry & Trim',
  'Interior Painting',
  'Flooring & Tile',
  'General Home Repairs',
  'Other',
];

export default function ContactSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    email: '',
    service: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Backend connection point: POST form data to your API or email service
    setSubmitted(true);
  };

  return (
    <section id="contact" ref={sectionRef} className="bg-background pt-12 pb-16 sm:pt-16 sm:pb-20 px-5 sm:px-6 md:px-12 lg:px-20">
      <div className="max-w-7xl mx-auto">

        {/* Section Header */}
        <div className="reveal mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full border border-border text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">
            Get in Touch
          </span>
          <h2 className="text-section-lg font-extrabold text-foreground">
            Ready to get started?<br />
            <span className="text-muted-foreground">Let&apos;s talk.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 items-start">

          {/* Left: Form — 3 cols */}
          <div className="lg:col-span-3 reveal reveal-delay-100">
            <div className="bg-card border border-border rounded-4xl p-5 sm:p-8 md:p-10">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Icon name="CheckBadgeIcon" size={32} />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Message Received!</h3>
                  <p className="text-muted-foreground max-w-sm leading-relaxed">
                    Thanks for reaching out. Fixora will call or text you back within the hour during business hours.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-2 text-sm font-bold text-primary hover:text-accent transition-colors"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="flex flex-col gap-2">
                      <label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Your Name *
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Ama Mensah"
                        className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <label htmlFor="phone" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Phone Number
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="024 123 4567"
                        className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Email Address *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="ama@email.com"
                      className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="service" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Service Needed
                    </label>
                    <select
                      id="service"
                      name="service"
                      value={form.service}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition"
                    >
                      <option value="">Select a service...</option>
                      {serviceOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label htmlFor="message" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Describe the Job *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={4}
                      value={form.message}
                      onChange={handleChange}
                      placeholder="e.g. Bathroom faucet is dripping, kitchen cabinet door won't close..."
                      className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="group flex items-center justify-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-accent transition-colors duration-300 w-full sm:w-auto min-h-[48px]"
                  >
                    Send My Request
                    <Icon name="ArrowRightIcon" size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right: Info cards — 2 cols */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Call card */}
            <div className="reveal reveal-delay-200 card-glow">
              <div className="bg-secondary rounded-4xl p-7 border border-white/5 flex flex-col gap-5">
                <div className="w-11 h-11 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
                  <Icon name="PhoneIcon" size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-1">Call or Text Directly</p>
                  <a
                    href="tel:+15035550192"
                    className="text-2xl font-extrabold text-white hover:text-primary transition-colors duration-200"
                  >
                    (503) 555-0192
                  </a>
                  <p className="text-white/50 text-sm mt-2 leading-relaxed">
                    Mon–Sat, 7:00 AM – 7:00 PM<br />
                    Emergency calls welcome
                  </p>
                </div>
              </div>
            </div>

            {/* Service Area card */}
            <div className="reveal reveal-delay-300 card-glow">
              <div className="bg-card border border-border rounded-4xl p-7 flex flex-col gap-5">
                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Icon name="MapPinIcon" size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Service Area</p>
                  <h3 className="text-xl font-bold text-foreground mb-3">Greater Accra & major cities</h3>
                  <div className="flex flex-wrap gap-2">
                    {['Accra', 'Kumasi', 'Tema', 'Takoradi', 'Cape Coast', 'Tamale'].map((city) => (
                      <span
                        key={city}
                        className="px-3 py-1.5 rounded-xl bg-muted border border-border text-xs font-semibold text-muted-foreground"
                      >
                        {city}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Trust badges */}
            <div className="reveal reveal-delay-400 card-glow">
              <div className="bg-card border border-border rounded-4xl p-7">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Credentials</p>
                <div className="flex flex-col gap-3">
                  {[
                    { icon: 'ShieldCheckIcon', text: 'Ghana Card–verified artisans' },
                    { icon: 'DocumentCheckIcon', text: 'Escrow-protected payments' },
                    { icon: 'StarIcon', text: 'Rated by Ghana households' },
                  ].map((badge) => (
                    <div key={badge.text} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Icon name={badge.icon as any} size={16} />
                      </div>
                      <span className="text-sm font-medium text-foreground">{badge.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}