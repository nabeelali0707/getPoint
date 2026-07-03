import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";
const isCapacitorExport = process.env.NEXT_OUTPUT_EXPORT === "true";

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
