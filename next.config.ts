import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components off for MVP — workout client state hydrates more reliably without it.
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
