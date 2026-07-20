import type { NextConfig } from 'next'

/**
 * Probex Next.js configuration.
 *
 * Routing note: nginx owns external routing. The app serves the cockpit at
 * root (`/`, `/markets`, …) via the app/(dashboard) route group — no basePath,
 * no assetPrefix, no rewrites.
 *
 * The single redirect below is a legacy alias for pre-restructure
 * `/dashboard/*` bookmarks and deep links. Safe to delete once nginx (or
 * time) has retired those URLs.
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: true,
      },
      {
        source: '/dashboard/:path*',
        destination: '/:path*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
