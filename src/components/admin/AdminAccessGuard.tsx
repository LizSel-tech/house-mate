'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Icon from '@/components/ui/AppIcon';
import { canAccessAdminPath } from '@/lib/admin-permissions';

export default function AdminAccessGuard({
  permissions,
  roleName,
  fallbackHref,
  children,
}: {
  permissions: string[];
  roleName: string;
  fallbackHref: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = canAccessAdminPath(pathname, permissions);

  useEffect(() => {
    if (!allowed && pathname === '/admin' && fallbackHref !== '/admin') {
      router.replace(fallbackHref);
    }
  }, [allowed, pathname, fallbackHref, router]);

  if (allowed) return <>{children}</>;

  return (
    <div className="rounded-2xl border border-border bg-card p-10 text-center max-w-lg mx-auto mt-10">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <Icon name="LockClosedIcon" size={22} className="text-muted-foreground" />
      </div>
      <h1 className="text-lg font-bold text-foreground">You don’t have access to this page</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Your role (<span className="font-semibold text-foreground">{roleName}</span>) doesn’t include
        this area. Ask a Super admin to update your role if you need it.
      </p>
      <Link
        href={fallbackHref}
        className="inline-flex mt-6 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-accent"
      >
        Go to an area you can use
      </Link>
    </div>
  );
}
