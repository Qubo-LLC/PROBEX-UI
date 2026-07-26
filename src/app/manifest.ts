import type { MetadataRoute } from 'next'
import { BASE_PATH } from '@/config/constants'

/**
 * Probex Web App Manifest
 * ────────────────────────
 * PWA manifest for the dashboard, served at `${BASE_PATH}/manifest.webmanifest`.
 *
 * ⚠️ Next.js does NOT apply `basePath` to values inside the manifest body — it
 * only prefixes the route the manifest is served from. Every path below
 * (start_url, scope, icon src, shortcut urls) must carry the prefix manually.
 *
 * This was a real production bug: with `start_url: '/'` and `scope: '/'`, the
 * dashboard's own manifest claimed the entire origin and pointed its start URL
 * at the marketing site root. Chrome honours that and sent anyone opening the
 * dashboard straight back to the landing page; Brave restricts PWA manifest
 * processing so it appeared to work there, which made it look browser-specific
 * rather than a manifest error.
 */

/** trailingSlash: true is set in next.config.ts, so app URLs end in `/`. */
const appUrl = (path = '') => `${BASE_PATH}/${path}`

export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'Probex | Prediction Intelligence',
    short_name:       'Probex',
    description:      'Prediction intelligence powered by the Consensus Engine. Institutional-grade forecasting across prediction markets.',

    // Scoped to the dashboard so the manifest never claims the marketing site.
    start_url:        appUrl(),
    scope:            appUrl(),
    display:          'standalone',
    orientation:      'portrait-primary',

    background_color: '#0B1220',
    theme_color:      '#3B82F6',

    categories: ['finance', 'business', 'productivity'],

    icons: [
      {
        src:     appUrl('favicon-32x32.png'),
        sizes:   '32x32',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     appUrl('favicon-48x48.png'),
        sizes:   '48x48',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     appUrl('apple-touch-icon.png'),
        sizes:   '180x180',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     appUrl('icon-192x192.png'),
        sizes:   '192x192',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     appUrl('icon-512x512.png'),
        sizes:   '512x512',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     appUrl('icon-512x512.png'),
        sizes:   '512x512',
        type:    'image/png',
        purpose: 'maskable',
      },
    ],

    // Destinations are post-consolidation domain pages (Phase 4). `/research`
    // is now a redirect into Strategy, so this points at the real URL rather
    // than relying on a redirect hop from a launcher shortcut.
    shortcuts: [
      {
        name:        'Markets',
        short_name:  'Markets',
        description: 'Browse Bitcoin prediction markets',
        url:         appUrl('markets/'),
      },
      {
        name:        'Positions',
        short_name:  'Positions',
        description: 'Open positions and settled trades',
        url:         appUrl('positions/'),
      },
      {
        name:        'Portfolio',
        short_name:  'Portfolio',
        description: 'View performance and capital',
        url:         appUrl('portfolio/'),
      },
      {
        name:        'Execution',
        short_name:  'Execution',
        description: 'Engine controls and order flow',
        url:         appUrl('execution/'),
      },
    ],
  }
}
