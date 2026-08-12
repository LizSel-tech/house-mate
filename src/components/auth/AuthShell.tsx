'use client';

import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';

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
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-secondary text-secondary-foreground p-10 xl:p-14">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-black/40" />
        <div className="absolute -right-20 top-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -left-16 bottom-10 w-64 h-64 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <AppLogo size={36} />
            <span className="font-display text-xl font-bold tracking-tight">Fixora</span>
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="text-xs font-bold uppercase tracking-widest text-secondary-foreground/50 mb-4">
            Trusted home services
          </p>
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
            Book verified artisans.
            <span className="text-primary"> Pay with escrow.</span>
          </h2>
          <p className="mt-4 text-secondary-foreground/70 leading-relaxed">
            Fixora connects Ghana households with skilled providers — identity-checked, review-rated, and paid only when work is confirmed.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-secondary-foreground/80">
            {[
              'Ghana Card verification for artisans',
              'Escrow holds funds until you confirm',
              'One login for customers and providers',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <Icon name="CheckIcon" size={12} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-secondary-foreground/40">© {new Date().getFullYear()} Fixora</p>
      </aside>

      <div className="flex flex-col min-h-screen">
        <header className="px-5 sm:px-8 py-5 flex items-center justify-between lg:justify-end">
          <Link href="/" className="flex lg:hidden items-center gap-2.5">
            <AppLogo size={32} />
            <span className="font-display text-lg font-bold text-foreground tracking-tight">Fixora</span>
          </Link>
          <Link
            href="/"
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            Back home
          </Link>
        </header>

        <main className="flex-1 flex items-start lg:items-center justify-center px-5 sm:px-8 pb-16">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">{title}</h1>
              <p className="mt-2 text-muted-foreground leading-relaxed">{subtitle}</p>
            </div>
            <div className="bg-card border border-border rounded-[1.75rem] p-6 sm:p-8 shadow-[0_20px_50px_-28px_rgba(28,25,23,0.35)]">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
