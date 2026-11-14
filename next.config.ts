import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl reads its request config from ./i18n/request.ts
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Note: the create-next-app template enabled `cacheComponents` / `partialPrefetching`.
  // We turned them off — the interface language is read from a cookie on every
  // request, and those features add strict caching rules that are easy to trip over.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
