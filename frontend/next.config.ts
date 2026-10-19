import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // The deploy workflow ships .next/standalone; keep the local Docker build and
  // `next start` behaviour compatible with that artifact.
  output: "standalone",
  // The repo may sit inside a parent with another lockfile; keep Turbopack
  // rooted at this app.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
