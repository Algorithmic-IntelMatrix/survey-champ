import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration for Cloudflare Pages deployment
  images: {
    unoptimized: true, // Required for static export and Cloudflare Pages
  },
};

export default nextConfig;
