import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 85],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.rocket.new',
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc',
      },
    ],
  },
  async rewrites() {
    return {
      // beforeFiles so legacy copies in public/uploads still go through access checks.
      beforeFiles: [{ source: '/uploads/:path*', destination: '/api/uploads/:path*' }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
