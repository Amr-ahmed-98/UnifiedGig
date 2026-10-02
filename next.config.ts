import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Opt database & Prisma modules out of Turbopack bundling so they resolve
  // cleanly from node_modules at serverless runtime without module hashing.
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-neon",
    "@neondatabase/serverless",
    "ws",
  ],
  turbopack: {
    // On Vercel, apps/web is the root directory. Locally in the monorepo,
    // dependencies are hoisted to the workspace root.
    root: process.env.VERCEL ? path.resolve(__dirname) : path.resolve(__dirname, "../../"),
  },
  // Only ship the specific icons/functions actually imported, instead of
  // bundling the whole package — cuts "unused JavaScript" from these two.
  experimental: {
    optimizePackageImports: ["lucide-react", "motion"],
  },
};

export default nextConfig;
