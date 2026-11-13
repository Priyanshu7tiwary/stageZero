import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The default bottom-left spot covers the sidebar's user footer.
  devIndicators: { position: "bottom-right" },
  partialPrefetching: true,
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
