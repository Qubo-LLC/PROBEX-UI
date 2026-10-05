import type { Metadata, Viewport } from 'next'
import { cookies, headers } from 'next/headers'
import { RUNTIME_GLOBAL_KEY } from '@/config/runtime'
import { resolveRuntimeConfig } from '@/config/runtime.server'
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

// ─── Typography ───────────────────────────────────────────────────────────
//
// No font is loaded here. Inter and JetBrains Mono used to be pulled through
// next/font/google from this file, which made fonts.googleapis.com a build-time
// dependency of the app's typography — and one that fails soft: on a failed
// fetch Next substitutes a metrics-adjusted "<Family> Fallback" and builds
// successfully, so the product renders in fallback type with only a warning in
// the log. The dev server was running in precisely that state.
//
// Both families now resolve from --font-sans / --font-mono, declared once in
// globals.css against fonts the operating system already provides. See the
// TYPEFACES block there for the stack rationale. Nothing about the type SCALE
// changed: the t-* classes, sizes, weights, letter-spacing and tabular figures
// are untouched — only where the glyphs come from.

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
    'Synatra',
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
  // Open Graph. The social preview carries the brand mark on the same plate
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

// Reads a "synatra-theme" cookie, if one is present, so the server can set
// data-theme before first paint. NOTE (verified 2026-09-16): nothing in the
// app writes that cookie — themeStore persists to localStorage only — so this
// resolves to DEFAULT_THEME on every request, and the inline <head> script
// below is what actually applies the persisted theme before hydration. The
// script's list of valid names is generated from THEME_NAMES; a hand-typed
// copy of it omitted 'ember', which gave Ember users a Midnight flash on
// every load.
/**
 * Public origin of the current request, used to turn a relative API base
 * ('/api') into something the server can probe. nginx sets both headers; the
 * X-Forwarded-* variants win because they carry the external scheme/host rather
 * than the loopback the proxy connected to.
 */
async function resolveRequestOrigin(): Promise<string | null> {
  try {
    const h     = await headers()
    const host  = h.get('x-forwarded-host') ?? h.get('host')
    const proto = h.get('x-forwarded-proto') ?? 'http'
    return host ? `${proto}://${host}` : null
  } catch {
    return null
  }
}

async function resolveInitialTheme(): Promise<ThemeName> {
  try {
    const cookieStore = await cookies()
    const themeCookie = cookieStore.get('synatra-theme')
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

  // Resolve the engine configuration for THIS request (including the backend
  // probe when API mode is 'auto') and hand the result to the browser. This is
  // what makes one build portable across dev/staging/production: the decision
  // is made from server environment at request time, never inlined at build.
  const runtimeConfig = await resolveRuntimeConfig(await resolveRequestOrigin())

  // `</script>` inside JSON would close the tag early; escaping `<` is the
  // standard mitigation for injecting server state into an inline script.
  const runtimeConfigJson = JSON.stringify(runtimeConfig).replace(/</g, '\\u003c')

  return (
    <html
      lang="en"
      data-theme={initialTheme}
      // Opt-in marker for Next.js router scroll handling — acknowledges the
      // intentional `scroll-behavior: smooth` on <html> (silences the dev
      // warning while preserving smooth scrolling).
      data-scroll-behavior="smooth"
      // No font className: next/font's generated variable classes are gone.
      // --font-sans / --font-mono are declared on :root in globals.css, so they
      // are in scope for the whole document without anything being mounted here.
      // Suppress hydration warning: data-theme will be updated client-side
      suppressHydrationWarning
    >
      <head>
        {/*
          Runtime engine config. MUST come before the app bundle executes —
          services/index.ts reads window.__SYNATRA_RUNTIME__ at module scope to
          pick live / mock / offline. An inline <head> script is evaluated
          during HTML parse, so it always wins that race.
        */}
        <script
          dangerouslySetInnerHTML={{
            // Frozen on the client too: Object.freeze() does not survive JSON
            // serialisation, so freezing server-side alone would leave a
            // mutable global that any script could rewrite to flip the app into
            // mock mode. Config is a fact about the deployment, not app state.
            __html: `window.${RUNTIME_GLOBAL_KEY}=Object.freeze(${runtimeConfigJson});`,
          }}
        />
        {/*
          Inline script: sets data-theme BEFORE React hydrates.
          This eliminates any remaining theme flash for users with JS enabled.
          The script reads localStorage directly — same key as Zustand persist.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = JSON.parse(localStorage.getItem('synatra-theme') || '{}');
                var theme  = stored?.state?.theme;
                var valid  = ${JSON.stringify(THEME_NAMES)};
                if (theme && valid.includes(theme)) {
                  document.documentElement.setAttribute('data-theme', theme);
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>
        <AppProviders initialTheme={initialTheme} runtimeConfig={runtimeConfig}>
          {children}
        </AppProviders>
      </body>
    </html>
  )
}
