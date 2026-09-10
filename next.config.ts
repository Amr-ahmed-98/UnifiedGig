import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only ship the specific icons/functions actually imported, instead of
  // bundling the whole package — cuts "unused JavaScript" from these two.
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
};

export default nextConfig;
