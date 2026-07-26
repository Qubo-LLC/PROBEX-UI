import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/dashboard",

  
  trailingSlash: true,

  allowedDevOrigins: [
    "qubo-probex.duckdns.org",
    "136.119.171.6",
  ],

  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://136.119.171.6:8000/api/:path*",
      },
      {
        source: "/health",
        destination: "http://136.119.171.6:8000/health",
      },
    ];
  },
};

export default nextConfig;
