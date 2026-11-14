import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The create-next-app template enabled `cacheComponents` / `partialPrefetching`.
  // They're off: most pages read per-user browser state, and those features add
  // strict caching rules that are easy for a new team to trip over.
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
