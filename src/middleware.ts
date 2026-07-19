import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, PORTAL_HOME, ROLE_FOR_PORTAL } from '@/lib/auth/constants';
import { decodeSession } from '@/lib/auth/session-token';
import type { PortalId } from '@/types/auth';

const PROTECTED_PREFIXES = ['/user', '/provider', '/admin'] as const;

function portalFromPath(pathname: string): PortalId | null {
  if (pathname.startsWith('/user')) return 'user';
  if (pathname.startsWith('/provider')) return 'provider';
  if (pathname.startsWith('/admin')) return 'admin';
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  const portal = portalFromPath(pathname);

  if (!session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (portal) {
    const requiredRole = ROLE_FOR_PORTAL[portal];
    if (session.role !== requiredRole) {
      const home = request.nextUrl.clone();
      home.pathname = PORTAL_HOME[session.role];
      home.search = '';
      return NextResponse.redirect(home);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/user/:path*', '/provider/:path*', '/admin/:path*'],
};
