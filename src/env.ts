import "server-only";

import {
  clientEnvSchema,
  parseEnv,
  serverEnvSchema,
  type ClientEnv,
  type ServerEnv,
} from "@/lib/env/schema";

/**
 * Typed, validated environment for server code. The only place the app reads
 * `process.env` (tooling configs like drizzle.config.ts are the exception).
 *
 * Set SKIP_ENV_VALIDATION=1 to bypass validation for tooling runs (e.g. lint in CI)
 * where real secrets aren't available.
 */
const skip = process.env.SKIP_ENV_VALIDATION === "1";

export const env: ServerEnv & ClientEnv = skip
  ? // Validation explicitly skipped; values may be missing at runtime by design.
    (process.env as unknown as ServerEnv & ClientEnv)
  : {
      ...parseEnv(serverEnvSchema, process.env),
      ...parseEnv(clientEnvSchema, {
        // NEXT_PUBLIC_* must be referenced literally so Next can inline them.
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      }),
    };
