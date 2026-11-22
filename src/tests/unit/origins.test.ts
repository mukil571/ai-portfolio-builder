import { describe, expect, it } from "vitest";

import {
  appBaseUrl,
  clientEnvSchema,
  parseEnv,
  serverEnvSchema,
  trustedOrigins,
} from "@/lib/env/schema";

const server = parseEnv(serverEnvSchema, {
  DATABASE_URL: "postgresql://u:p@host/db",
  BETTER_AUTH_SECRET: "x".repeat(32),
});

const envWith = (appUrl: string | undefined, vercel: Record<string, string> = {}) => ({
  ...parseEnv(serverEnvSchema, {
    DATABASE_URL: "postgresql://u:p@host/db",
    BETTER_AUTH_SECRET: "x".repeat(32),
    ...vercel,
  }),
  ...parseEnv(clientEnvSchema, { NEXT_PUBLIC_APP_URL: appUrl }),
});

describe("NEXT_PUBLIC_APP_URL normalization", () => {
  it.each([
    "https://ai-portfolio-builder-czbe.vercel.app/",
    "https://ai-portfolio-builder-czbe.vercel.app",
    "https://ai-portfolio-builder-czbe.vercel.app/login?x=1",
    "https://ai-portfolio-builder-czbe.vercel.app.",
    "https://ai-portfolio-builder-czbe.vercel.app./",
    " https://ai-portfolio-builder-czbe.vercel.app ",
  ])("reduces %s to a bare origin", (url) => {
    expect(parseEnv(clientEnvSchema, { NEXT_PUBLIC_APP_URL: url }).NEXT_PUBLIC_APP_URL).toBe(
      "https://ai-portfolio-builder-czbe.vercel.app",
    );
  });
});

describe("trustedOrigins", () => {
  it("is just the app origin locally", () => {
    expect(trustedOrigins(envWith(undefined))).toEqual(["http://localhost:3000"]);
    expect(server.VERCEL_URL).toBeUndefined();
  });

  it("adds Vercel production, deployment and branch URLs without duplicates", () => {
    const origins = trustedOrigins(
      envWith("https://ai-portfolio-builder-czbe.vercel.app/", {
        VERCEL_PROJECT_PRODUCTION_URL: "ai-portfolio-builder-czbe.vercel.app",
        VERCEL_URL: "ai-portfolio-builder-abc123.vercel.app",
        VERCEL_BRANCH_URL: "ai-portfolio-builder-git-main.vercel.app",
      }),
    );
    expect(origins).toEqual([
      "https://ai-portfolio-builder-czbe.vercel.app",
      "https://ai-portfolio-builder-abc123.vercel.app",
      "https://ai-portfolio-builder-git-main.vercel.app",
    ]);
  });
});

describe("appBaseUrl", () => {
  it("uses the configured URL when set", () => {
    expect(appBaseUrl(envWith("https://loriyum.example/"))).toBe("https://loriyum.example");
  });

  it("falls back to the Vercel production domain if left at localhost", () => {
    expect(
      appBaseUrl(
        envWith(undefined, {
          VERCEL_PROJECT_PRODUCTION_URL: "ai-portfolio-builder-czbe.vercel.app",
        }),
      ),
    ).toBe("https://ai-portfolio-builder-czbe.vercel.app");
  });
});

describe("emailVerificationRequired", () => {
  it("is on unless explicitly switched off", async () => {
    const { emailVerificationRequired, serverEnvSchema } = await import("@/lib/env/schema");
    const parse = (v: string | undefined) => serverEnvSchema.shape.EMAIL_VERIFICATION.parse(v);
    expect(emailVerificationRequired({ EMAIL_VERIFICATION: parse(undefined) })).toBe(true);
    expect(emailVerificationRequired({ EMAIL_VERIFICATION: parse("") })).toBe(true);
    expect(emailVerificationRequired({ EMAIL_VERIFICATION: parse("on") })).toBe(true);
    expect(emailVerificationRequired({ EMAIL_VERIFICATION: parse("off") })).toBe(false);
    expect(() => parse("maybe")).toThrow();
  });
});
