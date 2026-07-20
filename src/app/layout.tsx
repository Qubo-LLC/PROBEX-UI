import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import { AppProviders } from '@/providers'
import { APP_NAME, APP_TAGLINE } from '@/config/constants'
import { validateEnv } from '@/config/env'
import { DEFAULT_THEME, type ThemeName, THEME_NAMES } from '@/types/theme'
import './globals.css'
import type { ReactNode } from 'react'

// ─── Font configuration ───────────────────────────────────────────────────

// Fail fast on missing required env (throws in production, warns in dev).
// Module scope → runs once per server process, before any page renders.
validateEnv()

const inter = Inter({
  subsets:  ['latin'],
  variable: '--font-inter',
  display:  'swap',
  weight:   ['400', '500', '600', '700', '800'],
  preload:  true,
})

// Data / machine voice (Design System §typography): tabular monospace for every
// numeral, timestamp, latency, and engine-authored value. Loaded as a variable
// font (single file, full weight axis) and exposed as --font-mono, which
// tailwind's `mono` family and globals' `.font-data` already reference. Phase 1
// only makes the face available; casting data onto it is the Data-Plane phase.
const jetbrainsMono = JetBrains_Mono({
  subsets:  ['latin'],
  variable: '--font-mono',
  display:  'swap',
  preload:  true,
})

// ─── Metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    template: `%s | ${APP_NAME}`,
    default:  'Probex | Prediction Intelligence',
  },
  description: APP_TAGLINE,
  keywords: [
    'prediction markets',
    'prediction intelligence',
    'consensus intelligence',
    'probex',
    'institutional analytics',
    'forecasting platform',
  ],
  authors: [{ name: 'QUBO' }],
  creator: 'QUBO',
  robots: {
    index:  false, // MVP: not indexed
    follow: false,
  },
  // Open Graph
  openGraph: {
    type:        'website',
    locale:      'en_US',
    url:         process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.probex.io',
    siteName:    APP_NAME,
    title:       'Probex | Prediction Intelligence',
    description: APP_TAGLINE,
  },
  // Twitter card
  twitter: {
    card:  'summary_large_image',
    title: 'Probex | Prediction Intelligence',
  },
  // PWA manifest
  manifest: '/manifest.webmanifest',
  // Brand favicon — static blue "P" assets in /public (no longer generated).
  // Replace these files with the final brand asset to update everywhere.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192x192.png', type: 'image/png', sizes: '192x192' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width:               'device-width',
  initialScale:        1,
  maximumScale:        5,
  userScalable:        true,
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0B1220' },
    { media: '(prefers-color-scheme: light)', color: '#3B82F6' },
  ],
}

// ─── Theme SSR resolution ─────────────────────────────────────────────────

// Reads the persisted theme from the request cookie so the server can set
// data-theme before first paint (no theme flash). Cookie "probex-theme" is
// written by the Zustand persist middleware as { state: { theme } }.
async function resolveInitialTheme(): Promise<ThemeName> {
  try {
    const cookieStore = await cookies()
    const themeCookie = cookieStore.get('probex-theme')
    if (!themeCookie?.value) return DEFAULT_THEME

    const parsed = JSON.parse(themeCookie.value) as { state?: { theme?: string } }
    const theme  = parsed?.state?.theme

    if (theme && THEME_NAMES.includes(theme as ThemeName)) {
      return theme as ThemeName
    }
  } catch {
    // Invalid or missing cookie — use default
  }
  return DEFAULT_THEME
}

// ─── Root Layout ──────────────────────────────────────────────────────────

interface RootLayoutProps {
  children: ReactNode
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const initialTheme = await resolveInitialTheme()

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      // Opt-in marker for Next.js router scroll handling — acknowledges the
      // intentional `scroll-behavior: smooth` on <html> (silences the dev
      // warning while preserving smooth scrolling).
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      // Suppress hydration warning: data-theme will be updated client-side
      suppressHydrationWarning
    >
      <head>
        {/*
          Inline script: sets data-theme BEFORE React hydrates.
          This eliminates any remaining theme flash for users with JS enabled.
          The script reads localStorage directly — same key as Zustand persist.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = JSON.parse(localStorage.getItem('probex-theme') || '{}');
                var theme  = stored?.state?.theme;
                var valid  = ['aurora','midnight','quantum','emerald','institutional'];
                if (theme && valid.includes(theme)) {
                  document.documentElement.setAttribute('data-theme', theme);
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>
        <AppProviders initialTheme={initialTheme}>
          {children}
        </AppProviders>
      </body>
    </html>
  )
}
