'use client';

import { usePathname } from 'next/navigation';

export type PortalPaths = {
  home: string;
  search: string;
  bookings: string;
  provider: (id: string) => string;
  isProviderPortal: boolean;
};

export function portalPaths(isProviderPortal: boolean): PortalPaths {
  return isProviderPortal
    ? {
        home: '/provider/home',
        search: '/provider/search',
        bookings: '/provider/bookings',
        provider: (id) => `/provider/providers/${id}`,
        isProviderPortal: true,
      }
    : {
        home: '/user',
        search: '/user/search',
        bookings: '/user/bookings',
        provider: (id) => `/user/artisans/${id}`,
        isProviderPortal: false,
      };
}

/** Marketplace screens are shared by the client and service provider portals. */
export function usePortalPaths(): PortalPaths {
  const pathname = usePathname();
  return portalPaths(pathname.startsWith('/provider'));
}
