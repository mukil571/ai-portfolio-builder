import { describe, expect, it } from "vitest";

import { clientEnvSchema, parseEnv, serverEnvSchema } from "@/lib/env/schema";

const validDbUrl = "postgresql://user:pw@ep-test-pooler.example.neon.tech/neondb?sslmode=require";

describe("parseEnv", () => {
  it("accepts a valid server env and applies defaults", () => {
    const env = parseEnv(serverEnvSchema, { DATABASE_URL: validDbUrl });
    expect(env.DATABASE_URL).toBe(validDbUrl);
    expect(env.NODE_ENV).toBe("development");
    expect(env.DATABASE_URL_UNPOOLED).toBeUndefined();
  });

  it("lists every missing or invalid key in one error", () => {
    expect(() => parseEnv(serverEnvSchema, { NODE_ENV: "staging" })).toThrowError(
      /DATABASE_URL[\s\S]*NODE_ENV|NODE_ENV[\s\S]*DATABASE_URL/,
    );
  });

  it("rejects a malformed URL", () => {
    expect(() => parseEnv(serverEnvSchema, { DATABASE_URL: "not-a-url" })).toThrowError(
      /DATABASE_URL/,
    );
  });

  it("never includes secret values in the error message", () => {
    const secret = "postgresql://user:SUPERSECRET@host/db";
    try {
      parseEnv(serverEnvSchema, { DATABASE_URL: secret, NODE_ENV: "bogus" });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(String(error)).not.toContain("SUPERSECRET");
    }
  });

  it("defaults the public app URL", () => {
    expect(parseEnv(clientEnvSchema, {}).NEXT_PUBLIC_APP_URL).toBe("http://localhost:3000");
  });
});
