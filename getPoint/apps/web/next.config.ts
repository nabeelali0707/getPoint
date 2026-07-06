import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";
// Static export is only for Capacitor native builds — never on Vercel (VERCEL=1).
const isCapacitorExport =
  process.env.NEXT_OUTPUT_EXPORT === "true" && process.env.VERCEL !== "1";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  ...(isCapacitorExport
    ? { output: "export" as const }
    : {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: `${apiUrl}/api/:path*`,
            },
          ];
        },
      }),
};

export default nextConfig;
