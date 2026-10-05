import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/dashboard",

  
  trailingSlash: true,

  // NOTE: no `allowedDevOrigins`, and no API rewrites.
  //
  // `allowedDevOrigins` is a dev-server-only option; listing the production
  // domain there only made sense while production was (incorrectly) served by
  // `next dev`. Production runs `next start` behind nginx, which never consults
  // it.
  //
  // The rewrites that used to proxy /api and /health hardcoded a specific
  // backend IP into the config — the same "environment baked into the artifact"
  // problem this architecture removes. They were also dead in both
  // environments: nginx matches `^~ /api/` before Next ever sees the request in
  // production, and basePath rewrote the dev source to `/dashboard/api/*` which
  // `trailingSlash` then 308-redirected. The API base is configured at runtime
  // instead — see config/runtime.ts.

  // ─── Root → /dashboard ──────────────────────────────────────────────────────
  // `basePath: "/dashboard"` means the app owns NOTHING at the true origin root:
  // `src/app/(dashboard)/page.tsx` is served at `/dashboard`, and `/` is not a
  // route at all. So `npm run dev` prints "http://localhost:3000" and the first
  // thing a developer sees there is Next's 404.
  //
  // That 404 was repeatedly read as the app being broken — and it looked like it
  // was, because the 404 page still renders the root layout, which resolves the
  // runtime config, which ran a doomed 5s backend probe before painting. A
  // wrong-but-plausible story ("the health probe crashes the render") is easy to
  // reach from those two facts, and it cost real debugging time.
  //
  // In production nginx never routes `/` here, so this is invisible there; it is
  // purely a local-development papercut, which is exactly why it survived.
  //
  // `basePath: false` is required: without it Next prefixes both source and
  // destination, producing `/dashboard` → `/dashboard/dashboard`.
  async redirects() {
    return [
      { source: '/', destination: '/dashboard', permanent: false, basePath: false as const },
    ]
  },

  images: {
    // SynatraLogo renders the brand mark at quality 100 (it is a dense render
    // that visibly softens at the default 75). Next 15.5 warns when a quality
    // is used without being declared here, and Next 16 rejects it outright —
    // declaring it keeps the mark sharp and the console clean.
    qualities: [100],
  },
};

export default nextConfig;
