import type { NextConfig } from "next";

// Neon Object Storage endpoint (public_read bucket) — product & content images
const storageHost = (() => {
  try {
    return new URL(process.env.AWS_ENDPOINT_URL_S3 ?? "").hostname;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 480, 640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [64, 96, 128, 192, 256, 320],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: "https", hostname: "assets.wuiltstore.com" },
      { protocol: "https", hostname: "**.neon.tech" },
      ...(storageHost ? [{ protocol: "https" as const, hostname: storageHost }] : []),
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
    serverActions: { bodySizeLimit: "8mb" },
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
