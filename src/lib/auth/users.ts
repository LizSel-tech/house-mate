import type { SessionUser } from '@/types/auth';
import type { User } from '@/types/db';

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email ?? undefined,
    role: user.role as SessionUser['role'],
    avatarUrl: user.avatarUrl ?? null,
  };
}

export function isAppRole(role: string): role is SessionUser['role'] {
  return role === 'user' || role === 'artisan' || role === 'admin';
}

export type { UserRole } from '@/types/auth';
