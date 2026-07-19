'use client';

import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';

export default function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 sm:px-6 py-5 flex items-center justify-between max-w-lg mx-auto w-full">
        <Link href="/" className="flex items-center gap-2.5">
          <AppLogo size={32} />
          <span className="font-display text-lg font-bold text-foreground tracking-tight">
            The Handyman
          </span>
        </Link>
        <Link
          href="/"
          className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </Link>
      </header>

      <main className="flex-1 flex items-start justify-center px-5 sm:px-6 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{title}</h1>
            <p className="mt-2 text-muted-foreground leading-relaxed">{subtitle}</p>
          </div>
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
