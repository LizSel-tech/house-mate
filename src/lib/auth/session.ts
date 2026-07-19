import { cookies } from 'next/headers';
import type { SessionUser } from '@/types/auth';
import { SESSION_COOKIE } from './constants';
import { decodeSession, encodeSession, normalizePhone } from './session-token';

const ACCOUNTS_COOKIE = 'handyman_accounts';

export { decodeSession, encodeSession } from './session-token';

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

export async function setSession(user: SessionUser): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getAccounts(): Promise<Record<string, SessionUser>> {
  const store = await cookies();
  const raw = store.get(ACCOUNTS_COOKIE)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Record<
      string,
      SessionUser
    >;
  } catch {
    return {};
  }
}

export async function saveAccount(user: SessionUser): Promise<void> {
  const store = await cookies();
  const accounts = await getAccounts();
  accounts[normalizePhone(user.phone)] = user;
  store.set(ACCOUNTS_COOKIE, Buffer.from(JSON.stringify(accounts), 'utf8').toString('base64url'), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function findAccountByPhone(phone: string): Promise<SessionUser | null> {
  const accounts = await getAccounts();
  return accounts[normalizePhone(phone)] ?? null;
}
