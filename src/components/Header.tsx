'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';

const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'About', href: '#about' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Contact', href: '#contact' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleNavClick = () => setMenuOpen(false);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-secondary/90 backdrop-blur-xl border-b border-white/10 py-3' :'bg-transparent py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <AppLogo
              size={36}
              className="transition-transform duration-300 group-hover:scale-105"
            />
            <span className="font-display text-xl font-bold text-white tracking-tight hidden sm:block">
              HandyPro
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks?.map((link) => (
              <a
                key={link?.label}
                href={link?.href}
                className="text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors duration-200"
              >
                {link?.label}
              </a>
            ))}
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white transition-colors duration-200 px-3 py-2"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-accent transition-colors duration-200"
            >
              Get started
            </Link>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-11 h-11 rounded-full glass-panel-dark text-white"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <Icon name={menuOpen ? 'XMarkIcon' : 'Bars3Icon'} size={20} />
          </button>
        </div>
      </header>
      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-secondary/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8 md:hidden"
          onClick={handleNavClick}
        >
          {navLinks?.map((link) => (
            <a
              key={link?.label}
              href={link?.href}
              onClick={handleNavClick}
              className="text-2xl font-bold text-white/80 hover:text-white transition-colors uppercase tracking-widest"
            >
              {link?.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={handleNavClick}
            className="text-2xl font-bold text-white/80 hover:text-white transition-colors uppercase tracking-widest"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            onClick={handleNavClick}
            className="mt-4 bg-primary text-primary-foreground px-8 py-4 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-accent transition-colors"
          >
            Get started
          </Link>
        </div>
      )}
    </>
  );
}