import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed 'output: export' - builder needs SSR for auth and dynamic routes
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
