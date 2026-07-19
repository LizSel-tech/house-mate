'use client';

import React from 'react';
import AppImage from '@/components/ui/AppImage';
import Icon from '@/components/ui/AppIcon';

export default function HeroSection() {
  return (
    <section
      id="home"
      className="relative w-full min-h-screen bg-secondary overflow-hidden"
      style={{ minHeight: '100svh' }}>
      
      {/* Background Photo */}
      <div className="absolute inset-0 animate-enter" style={{ animationDuration: '1.2s' }}>
        <AppImage
          src="https://img.rocket.new/generatedImages/rocket_gen_img_1b99a65dd-1779788894920.png"
          alt="Skilled handyman in work clothes drilling into a wall in a bright modern home, warm natural light, professional craftsman at work"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw" />
        
        {/* Gradient Scrim — strong bottom, moderate top */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/20" />
        {/* Warm amber tint overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-transparent to-transparent" />
      </div>
      {/* Floating ambient blob */}
      <div
        className="absolute top-1/3 right-1/4 w-64 h-64 sm:w-96 sm:h-96 blob-primary animate-float pointer-events-none"
        aria-hidden="true" />
      
      {/* Navigation — absolute inside hero */}
      {/* Header is rendered in page.tsx above this section */}
      {/* Hero Content */}
      <div className="relative z-10 flex flex-col justify-end min-h-[100svh] pb-10 pt-28 sm:pb-16 sm:pt-32 px-5 sm:px-6 md:px-12 lg:px-20 max-w-7xl mx-auto w-full">

        {/* Badge Pills Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-8 animate-enter delay-100">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white text-secondary px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold shadow-lg hover:scale-105 transition-transform duration-300">
            <Icon name="StarIcon" variant="solid" size={14} className="text-primary shrink-0" />
            <span>4.9</span>
            <span className="text-muted-foreground font-medium">(340+ reviews)</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 glass-panel text-white px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
            <span className="sm:hidden">Portland · Available</span>
            <span className="hidden sm:inline">Portland, OR · Available Now</span>
          </div>
          <div className="glass-panel text-white px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium">
            Licensed & Insured
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-hero-xl font-extrabold text-white max-w-4xl mb-4 sm:mb-6 animate-enter delay-200">
          Your Home,<br />
          Fixed Right.<br />
          <span className="text-primary">First Time.</span>
        </h1>

        {/* Subheadline */}
        <p className="text-white/75 text-base sm:text-lg md:text-xl font-light max-w-xl leading-relaxed mb-8 sm:mb-10 animate-enter delay-300">
          Professional handyman services for Portland homeowners. No job too small — plumbing, carpentry, painting, and more.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto animate-enter delay-500">
          <a
            href="#contact"
            className="group flex items-center justify-between sm:justify-start gap-3 bg-primary text-primary-foreground pl-6 sm:pl-8 pr-2 py-3 sm:py-2.5 rounded-full font-bold text-sm hover:bg-accent transition-colors duration-300 min-h-[48px]">
            
            Get a Free Quote
            <span className="bg-secondary text-white p-2 rounded-full transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
              <Icon name="ArrowUpRightIcon" size={16} />
            </span>
          </a>
          <a
            href="tel:+15035550192"
            className="group flex items-center justify-between sm:justify-start gap-3 glass-panel text-white pl-6 sm:pl-8 pr-2 py-3 sm:py-2.5 rounded-full font-medium text-sm hover:bg-white/20 transition-colors duration-300 min-h-[48px]">
            
            Call (503) 555-0192
            <span className="bg-primary text-white p-2 rounded-full">
              <Icon name="PhoneIcon" size={16} />
            </span>
          </a>
        </div>

        {/* Bottom stat strip */}
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/10 grid grid-cols-3 gap-3 sm:flex sm:flex-wrap sm:gap-8 animate-enter delay-700">
          {[
          { value: '1,200+', label: 'Jobs Completed' },
          { value: '12 yrs', label: 'Experience' },
          { value: 'Same-Day', label: 'Response' }]?.
          map((stat) =>
          <div key={stat?.label}>
              <p className="text-xl sm:text-2xl font-extrabold text-white">{stat?.value}</p>
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-widest text-white/50 mt-0.5 leading-tight">{stat?.label}</p>
            </div>
          )}
        </div>
      </div>
    </section>);

}