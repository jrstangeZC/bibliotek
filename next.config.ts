import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    // Book covers from the Open Library Covers API (see lib/covers.ts). The
    // host answers with a redirect to archive.org, which `next/image` follows
    // without checking it against these patterns.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
        port: "",
        pathname: "/b/isbn/**",
        search: "?default=false",
      },
    ],
  },
}

export default nextConfig
