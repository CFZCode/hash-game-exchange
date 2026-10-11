import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH ?? '',
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  redirects: async () => [
    { source: '/', destination: '/dashboard', permanent: false },

    // The players screens moved to /users; keep old links and bookmarks working.
    { source: '/players', destination: '/users', permanent: true },
    { source: '/players/:path*', destination: '/users/:path*', permanent: true }
  ]
}

export default nextConfig
