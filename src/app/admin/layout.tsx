import { redirect } from 'next/navigation';
import AdminAccessGuard from '@/components/admin/AdminAccessGuard';
import PortalShell, { type PortalNavItem } from '@/components/portals/PortalShell';
import { canAccessAdminPath } from '@/lib/admin-permissions';
import { getAdminAccess } from '@/lib/auth/admin-access';
import { getSession } from '@/lib/auth/session';

const navItems: PortalNavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'HomeIcon' },
  { href: '/admin/payments', label: 'Payments', icon: 'BanknotesIcon' },
  { href: '/admin/payouts', label: 'Payouts', icon: 'ArrowUpTrayIcon' },
  { href: '/admin/notifications', label: 'Notifications', icon: 'BellAlertIcon' },
  { href: '/admin/chat', label: 'Chat', icon: 'ChatBubbleLeftRightIcon' },
  { href: '/admin/verifications', label: 'Verifications', icon: 'ShieldCheckIcon' },
  { href: '/admin/bookings', label: 'Bookings', icon: 'CalendarDaysIcon' },
  { href: '/admin/users', label: 'User management', icon: 'UsersIcon' },
  { href: '/admin/settings', label: 'Settings', icon: 'Cog6ToothIcon' },
  { href: '/admin/profile', label: 'Profile', icon: 'UserCircleIcon' },
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

  const access = await getAdminAccess(user.id);
  if (!access || access.accountStatus === 'suspended') {
    redirect('/login?next=/admin');
  }

  const visibleNav = navItems.filter((item) => canAccessAdminPath(item.href, access.permissions));
  const fallbackHref = visibleNav[0]?.href || '/admin/profile';

  return (
    <PortalShell user={user} title="Admin" navItems={visibleNav} wide>
      <AdminAccessGuard
        permissions={access.permissions}
        roleName={access.roleName}
        fallbackHref={fallbackHref}
      >
        {children}
      </AdminAccessGuard>
    </PortalShell>
  );
}
