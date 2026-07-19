import { redirect } from 'next/navigation';
import PortalShell, { type PortalNavItem } from '@/components/portals/PortalShell';
import { getSession } from '@/lib/auth/session';

const navItems: PortalNavItem[] = [
  { href: '/provider', label: 'Dashboard', icon: 'HomeIcon' },
  { href: '/provider/jobs', label: 'Job requests', icon: 'BriefcaseIcon' },
  { href: '/provider/services', label: 'Services', icon: 'WrenchScrewdriverIcon' },
  { href: '/provider/verification', label: 'Verification', icon: 'ShieldCheckIcon' },
  { href: '/provider/earnings', label: 'Earnings', icon: 'BanknotesIcon' },
  { href: '/provider/profile', label: 'Profile', icon: 'UserCircleIcon' },
];

export default async function ProviderPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();
  if (!user || user.role !== 'artisan') {
    redirect('/login?next=/provider');
  }

  return (
    <PortalShell user={user} title="Service Provider" navItems={navItems}>
      {children}
    </PortalShell>
  );
}
