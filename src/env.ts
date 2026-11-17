import "server-only";

import {
  clientEnvSchema,
  parseEnv,
  serverEnvSchema,
  type ClientEnv,
  type ServerEnv,
} from "@/lib/env/schema";

export type Env = ServerEnv & ClientEnv;

let cached: Env | undefined;

/**
 * Typed, validated environment for server code. The only place the app reads
 * `process.env` (tooling configs like drizzle.config.ts are the exception).
 *
 * Validation is lazy (first call, not module load) so `next build` can import
 * route modules without runtime secrets; a missing var fails the request that
 * needs it, not the whole deploy.
 *
 * Set SKIP_ENV_VALIDATION=1 to bypass validation for tooling runs.
 */
export function getEnv(): Env {
  if (cached) return cached;
  cached =
    process.env.SKIP_ENV_VALIDATION === "1"
      ? // Validation explicitly skipped; values may be missing at runtime by design.
        (process.env as unknown as Env)
      : {
          ...parseEnv(serverEnvSchema, process.env),
          ...parseEnv(clientEnvSchema, {
            // NEXT_PUBLIC_* must be referenced literally so Next can inline them.
            NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
          }),
        };
  return cached;
}
