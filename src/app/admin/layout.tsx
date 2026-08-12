import { redirect } from 'next/navigation';
import PortalShell, { type PortalNavItem } from '@/components/portals/PortalShell';
import { getSession } from '@/lib/auth/session';

const navItems: PortalNavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'HomeIcon' },
  { href: '/admin/payments', label: 'Payments', icon: 'BanknotesIcon' },
  { href: '/admin/notifications', label: 'Notifications', icon: 'BellAlertIcon' },
  { href: '/admin/verifications', label: 'Verifications', icon: 'ShieldCheckIcon' },
  { href: '/admin/bookings', label: 'Bookings', icon: 'CalendarDaysIcon' },
  { href: '/admin/users', label: 'Users', icon: 'UsersIcon' },
  { href: '/admin/settings', label: 'Settings', icon: 'Cog6ToothIcon' },
];

export default async function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user || user.role !== 'admin') {
    redirect('/login?next=/admin');
  }

  return (
    <PortalShell user={user} title="Admin" navItems={navItems}>
      {children}
    </PortalShell>
  );
}
