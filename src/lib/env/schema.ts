import { z } from "zod";

/** Optional secret: unset and "" (common in hosting dashboards) both mean "not configured". */
const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

/** Variables only ever read on the server. Never import these into client code. */
export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  /** Pooled Neon connection string, used by the app at runtime. */
  DATABASE_URL: z.url(),
  /** Direct (unpooled) Neon connection string, used by drizzle-kit migrations. */
  DATABASE_URL_UNPOOLED: z.url().optional(),
  /** Signs sessions and tokens. Generate with: openssl rand -base64 32 */
  BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
  /** Google sign-in. The Google button is hidden unless both are set. */
  GOOGLE_CLIENT_ID: optionalSecret,
  GOOGLE_CLIENT_SECRET: optionalSecret,
  /** Transactional email. Unset in dev: emails are printed to the server log instead. */
  RESEND_API_KEY: optionalSecret,
  EMAIL_FROM: z.string().min(3).default("Loriyum <onboarding@resend.dev>"),
  /** Platform Google AI key for the fixed embedding model. Optional until Phase 4. */
  GOOGLE_GENERATIVE_AI_API_KEY: optionalSecret,
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
