'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';
import type { SessionUser } from '@/types/auth';
import { ROLE_LABELS } from '@/lib/auth/constants';

export type PortalNavItem = {
  href: string;
  label: string;
  icon: string;
};

export default function PortalShell({
  user,
  title,
  navItems,
  children,
}: {
  user: SessionUser;
  title: string;
  navItems: PortalNavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!logoutOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loggingOut) setLogoutOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [logoutOpen, loggingOut]);

  const openLogoutConfirm = () => {
    setMenuOpen(false);
    setLogoutOpen(true);
  };

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col bg-secondary text-white shrink-0">
        <div className="px-5 py-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5">
            <AppLogo size={32} />
            <div>
              <p className="font-bold tracking-tight">The Handyman</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40 mt-0.5">
                {title}
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== navItems[0]?.href && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon name={item.icon} size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-5 border-t border-white/10">
          <p className="text-sm font-semibold truncate">{user.name}</p>
          <p className="text-xs text-white/40 mt-0.5">{ROLE_LABELS[user.role]}</p>
          <p className="text-xs text-white/40">{user.phone}</p>
          <button
            type="button"
            onClick={openLogoutConfirm}
            className="mt-4 w-full text-left text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-secondary text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AppLogo size={28} />
          <span className="font-bold text-sm">{title}</span>
        </div>
        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
        >
          <Icon name="Bars3Icon" size={20} />
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-secondary/95 backdrop-blur-xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <p className="font-bold text-white">{title}</p>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
            >
              <Icon name="XMarkIcon" size={20} />
            </button>
          </div>
          <nav className="flex flex-col gap-2 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/80 hover:bg-white/5 font-medium"
              >
                <Icon name={item.icon} size={20} />
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={openLogoutConfirm}
            className="text-left text-sm font-bold uppercase tracking-widest text-white/50 py-4"
          >
            Sign out
          </button>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 md:py-10">{children}</div>
      </main>

      {logoutOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-dialog-title"
        >
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !loggingOut && setLogoutOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-xl">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <Icon name="ArrowRightOnRectangleIcon" size={22} />
            </div>
            <h2 id="logout-dialog-title" className="text-xl font-extrabold text-foreground">
              Sign out?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to sign out of your {ROLE_LABELS[user.role].toLowerCase()} account?
            </p>
            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setLogoutOpen(false)}
                disabled={loggingOut}
                className="flex-1 px-4 py-3 rounded-full border border-border text-sm font-bold uppercase tracking-widest text-foreground hover:bg-muted transition-colors disabled:opacity-60 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                disabled={loggingOut}
                className="flex-1 px-4 py-3 rounded-full bg-primary text-primary-foreground text-sm font-bold uppercase tracking-widest hover:bg-accent transition-colors disabled:opacity-60 min-h-[44px]"
              >
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
