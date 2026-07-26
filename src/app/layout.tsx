import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import { AppProviders } from '@/providers'
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION, BASE_PATH, SITE_ORIGIN, SITE_URL } from '@/config/constants'
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

// Optional social handle — only emitted when the deploy provides it, so a
// wrong/placeholder @handle is never shipped. See .env.example.
const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_HANDLE

export const metadata: Metadata = {
  // Resolves relative Open Graph / Twitter / canonical URLs to absolute ones.
  // Setting this is what silences Next's "metadataBase is not set … falling
  // back to http://localhost:3000" warning. Origin is environment-aware
  // (see SITE_ORIGIN); the /dashboard basePath is added per-field below.
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    template: `%s | ${APP_NAME}`,
    default:  `${APP_NAME} | ${APP_TAGLINE}`,
  },
  description:     APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    'probex',
    'autonomous trading',
    'bitcoin trading bot',
    'quantitative trading',
    'trading intelligence',
    'institutional trading platform',
    'consensus engine',
    'execution engine',
  ],
  authors:   [{ name: 'QUBO', url: SITE_ORIGIN }],
  creator:   'QUBO',
  publisher: 'QUBO',
  category:  'finance',
  referrer:  'strict-origin-when-cross-origin',
  robots: {
    index:  false, // MVP: not indexed
    follow: false,
  },
  // Canonical points at the dashboard base, not the marketing-site origin.
  alternates: {
    canonical: BASE_PATH,
  },
  // Open Graph. The social preview carries the crystal mark on the same plate
  // as the app icon, so a shared link and an installed icon read as one brand.
  // Image paths are NOT basePath-prefixed by Next — hence the explicit
  // BASE_PATH; they resolve to absolute URLs via metadataBase.
  openGraph: {
    type:        'website',
    locale:      'en_US',
    url:         SITE_URL,
    siteName:    APP_NAME,
    title:       `${APP_NAME} | ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    images: [{
      url:    `${BASE_PATH}/og-image.png`,
      width:  1200,
      height: 630,
      alt:    `${APP_NAME} — autonomous trading intelligence`,
    }],
  },
  // Twitter card
  twitter: {
    card:        'summary_large_image',
    title:       `${APP_NAME} | ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    images:      [`${BASE_PATH}/og-image.png`],
    ...(TWITTER_HANDLE ? { creator: TWITTER_HANDLE, site: TWITTER_HANDLE } : {}),
  },
  // PWA manifest. Next DOES prefix basePath on this field.
  manifest: '/manifest.webmanifest',
  // Brand favicon.
  //
  // ⚠️ Next does NOT prefix basePath on `icons` (unlike `manifest` directly
  // above — verified against the deployed HTML). Left root-relative, these
  // resolved against the marketing site at the domain root, where every PNG
  // 404s and only /favicon.ico exists — so the dashboard was silently showing
  // the *marketing site's* icon. Paths must carry the prefix explicitly.
  icons: {
    icon: [
      { url: `${BASE_PATH}/favicon.ico`, sizes: 'any' },
      { url: `${BASE_PATH}/favicon-16x16.png`, type: 'image/png', sizes: '16x16' },
      { url: `${BASE_PATH}/favicon-32x32.png`, type: 'image/png', sizes: '32x32' },
      { url: `${BASE_PATH}/icon-192x192.png`, type: 'image/png', sizes: '192x192' },
    ],
    shortcut: `${BASE_PATH}/favicon.ico`,
    apple: `${BASE_PATH}/apple-touch-icon.png`,
  },
}

export const viewport: Viewport = {
  width:               'device-width',
  initialScale:        1,
  maximumScale:        5,
  userScalable:        true,
  // Dark-first product with a sanctioned light (institutional) theme — declaring
  // both lets the browser render form controls/scrollbars to match either.
  colorScheme:         'dark light',
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
