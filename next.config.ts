import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Large multipart uploads to /api/gallery/upload (self-hosted Node; Vercel still has platform limits).
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;
