import type { SessionUser } from '@/types/auth';

/**
 * Session cookie format: `<base64url(json)>.<base64url(hmac-sha256)>`.
 * Uses Web Crypto so it works in both the Edge middleware and Node route handlers.
 */

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

const DEV_FALLBACK_SECRET = 'craftviva-dev-only-session-secret-change-me';
const encoder = new TextEncoder();
let cachedKey: { secret: string; key: Promise<CryptoKey> } | null = null;
let warnedFallback = false;

function sessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET?.trim();
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') {
    console.error('SESSION_SECRET is missing or shorter than 32 characters; all sessions are rejected.');
    return null;
  }
  if (!warnedFallback) {
    warnedFallback = true;
    console.warn('SESSION_SECRET is not set; using an insecure development secret.');
  }
  return DEV_FALLBACK_SECRET;
}

function hmacKey(secret: string): Promise<CryptoKey> {
  if (cachedKey?.secret !== secret) {
    cachedKey = {
      secret,
      key: crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify'],
      ),
    };
  }
  return cachedKey.key;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

type SessionPayload = SessionUser & { exp: number };

export async function encodeSession(user: SessionUser): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error('Sessions are not configured. Set SESSION_SECRET.');

  const payload: SessionPayload = {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl ?? null,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const body = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function decodeSession(value: string | undefined): Promise<SessionUser | null> {
  if (!value) return null;
  const secret = sessionSecret();
  if (!secret) return null;

  const dot = value.lastIndexOf('.');
  if (dot <= 0) return null;
  const body = value.slice(0, dot);

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      base64UrlToBytes(value.slice(dot + 1)),
      encoder.encode(body),
    );
    if (!valid) return null;

    const parsed = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as SessionPayload;
    if (!parsed?.id || !parsed?.role || !parsed?.phone) return null;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      id: parsed.id,
      name: parsed.name,
      phone: parsed.phone,
      email: parsed.email,
      role: parsed.role,
      avatarUrl: parsed.avatarUrl ?? null,
    };
  } catch {
    return null;
  }
}
