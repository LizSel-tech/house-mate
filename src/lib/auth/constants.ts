import type { PortalId, UserRole } from '@/types/auth';

export const SESSION_COOKIE = 'handyman_session';

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

/** Demo OTP accepted until SMS provider is wired */
export const DEMO_OTP = '123456';
