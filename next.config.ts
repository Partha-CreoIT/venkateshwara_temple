import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    qualities: [75, 90],
  },
  async headers() {
    return [
      {
        // The film frames and atlases are content-stable build artefacts, but
        // Next serves /public with `max-age=0, must-revalidate` — which turns
        // every repeat visit into 218 conditional requests before a single
        // frame can be drawn. Pin them instead; scripts/build-film.sh is the
        // only thing that changes them, and it rewrites every file at once.
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
