import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components off for MVP — workout client state hydrates more reliably without it.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
