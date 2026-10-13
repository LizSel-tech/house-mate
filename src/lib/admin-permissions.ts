export const ADMIN_PERMISSIONS = [
  {
    id: 'dashboard.view',
    label: 'Dashboard & reports',
    description: 'See platform KPIs, charts and recent activity.',
  },
  {
    id: 'payments.manage',
    label: 'Signup payments',
    description: 'Approve or reject signup payments and manage payment methods.',
  },
  {
    id: 'verifications.manage',
    label: 'Provider verification',
    description: 'Review provider documents and identity (KYC) checks.',
  },
  {
    id: 'bookings.manage',
    label: 'Bookings & disputes',
    description: 'View all bookings and step in on disputes.',
  },
  {
    id: 'chat.view',
    label: 'Chat oversight',
    description: 'Read conversations between clients and providers.',
  },
  {
    id: 'notifications.view',
    label: 'Admin alerts',
    description: 'See and clear admin notifications.',
  },
  {
    id: 'users.manage',
    label: 'User management',
    description: 'Create, edit, suspend users and resend sign-in emails.',
  },
  {
    id: 'roles.manage',
    label: 'Roles & permissions',
    description: 'Create and edit admin roles and assign them.',
  },
  {
    id: 'settings.manage',
    label: 'Platform settings',
    description: 'Change fees, commission and platform configuration.',
  },
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]['id'];

export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = ADMIN_PERMISSIONS.map((p) => p.id);

export function isAdminPermission(value: string): value is AdminPermission {
  return (ALL_ADMIN_PERMISSIONS as string[]).includes(value);
}

/**
 * Admin portal routes and the permissions that unlock them (any one is enough).
 * Routes not listed (e.g. /admin/profile) are open to every admin.
 */
export const ADMIN_ROUTE_PERMISSIONS: { prefix: string; anyOf: AdminPermission[] }[] = [
  { prefix: '/admin/payments', anyOf: ['payments.manage'] },
  { prefix: '/admin/payouts', anyOf: ['payments.manage'] },
  { prefix: '/admin/verifications', anyOf: ['verifications.manage'] },
  { prefix: '/admin/bookings', anyOf: ['bookings.manage'] },
  { prefix: '/admin/chat', anyOf: ['chat.view'] },
  { prefix: '/admin/notifications', anyOf: ['notifications.view'] },
  { prefix: '/admin/users', anyOf: ['users.manage', 'roles.manage'] },
  { prefix: '/admin/settings', anyOf: ['settings.manage'] },
];

export function permissionsForAdminPath(pathname: string): AdminPermission[] | null {
  if (pathname === '/admin') return ['dashboard.view'];
  const match = ADMIN_ROUTE_PERMISSIONS.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  return match?.anyOf ?? null;
}

export function canAccessAdminPath(pathname: string, granted: readonly string[]): boolean {
  const needed = permissionsForAdminPath(pathname);
  return !needed || needed.some((p) => granted.includes(p));
}
