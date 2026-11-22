import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // The real font loader only runs inside Next's compiler.
      "next/font/google": fileURLToPath(
        new URL("./src/tests/helpers/next-font-google.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["src/tests/e2e/**", "node_modules/**"],
  },
});
