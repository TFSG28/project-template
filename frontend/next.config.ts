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
  // Dev-only same-origin proxy: o browser chama /api/v1 na origem do Next e o
  // pedido é encaminhado ao backend (:3001), espelhando o reverse proxy do
  // deploy — cookies httpOnly e CSRF comportam-se como em produção. Em
  // produção o proxy do servidor trata o encaminhamento e isto não corre.
  async rewrites() {
    if (process.env.NODE_ENV === "production") return [];
    return [
      { source: "/api/v1/:path*", destination: "http://localhost:3001/api/v1/:path*" },
      { source: "/uploads/:path*", destination: "http://localhost:3001/uploads/:path*" },
    ];
  },
};

export default nextConfig;
