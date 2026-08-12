import type { User, UserRole } from '@prisma/client';
import type { SessionUser } from '@/types/auth';

export function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email ?? undefined,
    role: user.role as SessionUser['role'],
  };
}

export function isAppRole(role: string): role is SessionUser['role'] {
  return role === 'user' || role === 'artisan' || role === 'admin';
}

export type { UserRole };
