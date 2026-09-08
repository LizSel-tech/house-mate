import { redirect } from 'next/navigation';
import PortalShell, { type PortalNavItem } from '@/components/portals/PortalShell';
import { getSession } from '@/lib/auth/session';

const navItems: PortalNavItem[] = [
  { href: '/user', label: 'Home page', icon: 'HomeIcon' },
  { href: '/user/search', label: 'Find artisans', icon: 'MagnifyingGlassIcon' },
  { href: '/user/bookings', label: 'My bookings', icon: 'CalendarDaysIcon' },
  { href: '/user/settings', label: 'Settings', icon: 'Cog6ToothIcon' },
  { href: '/user/profile', label: 'Profile', icon: 'UserCircleIcon' },
];

export default async function UserPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user || user.role !== 'user') {
    redirect('/login?next=/user');
  }

  return (
    <PortalShell user={user} title="Service User" navItems={navItems} wide>
      {children}
    </PortalShell>
  );
}
