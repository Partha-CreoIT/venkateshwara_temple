import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 90],
  },
  async headers() {
    return [
      {
        // The film videos are content-stable build artefacts, but Next serves
        // /public with `max-age=0, must-revalidate` — which would revalidate
        // the ~19 MB scrub encode on every repeat visit. Pin them instead;
        // scripts/build-film.sh is the only thing that changes them, and it
        // rewrites every file at once.
        source: "/film/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
