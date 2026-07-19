import type { SessionUser } from '@/types/auth';

function toBase64Url(value: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf8').toString('base64url');
  }
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64url').toString('utf8');
  }
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeSession(user: SessionUser): string {
  return toBase64Url(JSON.stringify(user));
}

export function decodeSession(value: string | undefined): SessionUser | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(value)) as SessionUser;
    if (!parsed?.id || !parsed?.role || !parsed?.phone) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}
