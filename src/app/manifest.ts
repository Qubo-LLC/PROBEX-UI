import type { MetadataRoute } from 'next'

/**
 * Probex Web App Manifest
 * ────────────────────────
 * PWA-ready. Icons use the Option 2 brand mark (blue→purple gradient "P"),
 * generated from public/probex-icon.svg into the /public PNG + ICO set.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name:             'Probex | Prediction Intelligence',
    short_name:       'Probex',
    description:      'Prediction intelligence powered by the Consensus Engine. Institutional-grade forecasting across prediction markets.',

    start_url:        '/',
    scope:            '/',
    display:          'standalone',
    orientation:      'portrait-primary',

    background_color: '#0B1220',
    theme_color:      '#3B82F6',

    categories: ['finance', 'business', 'productivity'],

    icons: [
      {
        src:     '/favicon-32x32.png',
        sizes:   '32x32',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     '/favicon-48x48.png',
        sizes:   '48x48',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     '/apple-touch-icon.png',
        sizes:   '180x180',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     '/icon-192x192.png',
        sizes:   '192x192',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     '/icon-512x512.png',
        sizes:   '512x512',
        type:    'image/png',
        purpose: 'any',
      },
      {
        src:     '/icon-512x512.png',
        sizes:   '512x512',
        type:    'image/png',
        purpose: 'maskable',
      },
    ],

    shortcuts: [
      {
        name:        'Markets',
        short_name:  'Markets',
        description: 'Browse Bitcoin prediction markets',
        url:         '/markets',
      },
      {
        name:        'Portfolio',
        short_name:  'Portfolio',
        description: 'View your positions and performance',
        url:         '/portfolio',
      },
      {
        name:        'Research',
        short_name:  'Research',
        description: 'Read market intelligence reports',
        url:         '/research',
      },
    ],
  }
}
