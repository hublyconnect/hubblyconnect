import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
    middlewareClientMaxBodySize: "200mb",
  },
};

export default nextConfig;
