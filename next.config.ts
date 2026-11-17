import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local-dev PGlite database (lib/db/local.ts): load from node_modules, never bundle,
  // so its WASM/data files resolve normally.
  serverExternalPackages: ["@electric-sql/pglite", "@electric-sql/pglite-pgvector"],
  cacheComponents: true,
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
