import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** This repo’s root — fixes Turbopack when a parent folder also has package-lock.json */
const repoRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Next 16: pin workspace root so dev server does not pick ~/package-lock.json
  turbopack: {
    root: repoRoot,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5001/:path*",
      },
    ];
  },
};

export default nextConfig;
