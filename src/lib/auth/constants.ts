import type { PortalId, UserRole } from '@/types/auth';

export const SESSION_COOKIE = 'handyman_session';

/**
 * The "demo admin" login shortcut creates an admin for an unknown phone number.
 * Never available in production builds; set ENABLE_DEMO_ADMIN=false to turn it off locally too.
 */
export function isDemoAdminEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO_ADMIN !== 'false';
}

export const PORTAL_HOME: Record<UserRole, string> = {
  user: '/user',
  artisan: '/provider',
  admin: '/admin',
};

export const PORTAL_BY_PATH: Record<string, PortalId> = {
  user: 'user',
  provider: 'provider',
  admin: 'admin',
};

export const ROLE_FOR_PORTAL: Record<PortalId, UserRole> = {
  user: 'user',
  provider: 'artisan',
  admin: 'admin',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Service User',
  artisan: 'Service Provider',
  admin: 'Admin',
};