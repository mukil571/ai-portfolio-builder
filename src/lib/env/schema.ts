import { z } from "zod";

/** Variables only ever read on the server. Never import these into client code. */
export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Pooled Neon connection string, used by the app at runtime. */
  DATABASE_URL: z.url(),
  /** Direct (unpooled) Neon connection string, used by drizzle-kit migrations. */
  DATABASE_URL_UNPOOLED: z.url().optional(),
});

/** Variables safe to expose to the browser. Must be prefixed NEXT_PUBLIC_. */
export const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default("http://localhost:3000"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Parses `source` against `schema`. Throws one readable error listing every
 * invalid or missing key (values are never included, so secrets don't leak into logs).
 */
export function parseEnv<T extends z.ZodType>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables:\n${problems}\nSee .env.example for the full list.`,
    );
  }
  return result.data;
}
