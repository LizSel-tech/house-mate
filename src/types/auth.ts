export type UserRole = 'user' | 'artisan' | 'admin';

export type PortalId = 'user' | 'provider' | 'admin';

export interface SessionUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  avatarUrl?: string | null;
}

export interface SignupPayload {
  name: string;
  phone: string;
  email?: string;
  role: Extract<UserRole, 'user' | 'artisan'>;
}

export interface LoginPayload {
  phone: string;
  otp: string;
}
