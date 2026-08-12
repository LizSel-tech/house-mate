import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-12 sm:py-16 flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Logo + Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <AppLogo size={32} />
          <span className="font-display text-base font-bold text-foreground tracking-tight">
            Fixora
          </span>
        </Link>

        {/* Links */}
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 sm:gap-8">
          <a
            href="#services"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Services
          </a>
          <a
            href="#about"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            About
          </a>
          <a
            href="#contact"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Contact
          </a>
          <a
            href="#contact"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Privacy
          </a>
          <a
            href="#contact"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Terms
          </a>
        </nav>

        {/* Copyright */}
        <p className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          © 2026 Fixora
        </p>
      </div>
    </footer>
  );
}