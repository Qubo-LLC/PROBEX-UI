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

  images: {
    // ProbexLogo renders the brand mark at quality 100 (it is a dense render
    // that visibly softens at the default 75). Next 15.5 warns when a quality
    // is used without being declared here, and Next 16 rejects it outright —
    // declaring it keeps the mark sharp and the console clean.
    qualities: [100],
  },
};

export default nextConfig;
