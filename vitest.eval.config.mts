import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// The eval calls real models: load .env.local (GOOGLE_GENERATIVE_AI_API_KEY etc.).
config({ path: ".env.local", quiet: true });

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // server-only modules are fine to import from this Node test process.
      "server-only": fileURLToPath(new URL("./src/tests/helpers/empty-module.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/tests/eval/**/*.eval.ts"],
    fileParallelism: false,
    testTimeout: 300_000,
    hookTimeout: 600_000,
  },
});
