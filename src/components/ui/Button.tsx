'use client';

import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

const variants = {
  primary:
    'bg-primary text-primary-foreground hover:bg-accent',
  secondary:
    'bg-secondary text-secondary-foreground hover:bg-secondary/90',
  outline:
    'border border-border bg-transparent text-foreground hover:bg-muted',
  ghost:
    'bg-transparent text-foreground hover:bg-muted',
};

type Common = {
  children: ReactNode;
  loading?: boolean;
  variant?: keyof typeof variants;
  className?: string;
};

export function Button({
  children,
  loading = false,
  variant = 'primary',
  className = '',
  disabled,
  type = 'button',
  ...props
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold text-xs uppercase tracking-widest min-h-[44px] px-5 py-2.5 transition-colors disabled:opacity-60 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = 'primary',
  className = '',
}: Common & { href: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold text-xs uppercase tracking-widest min-h-[44px] px-5 py-2.5 transition-colors ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
