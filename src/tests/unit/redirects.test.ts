import { describe, expect, it } from "vitest";

import { safeNext } from "@/lib/auth/redirects";

describe("safeNext", () => {
  it.each(["/dashboard", "/dashboard/sites/abc?tab=inbox"])("keeps relative path %s", (path) => {
    expect(safeNext(path)).toBe(path);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "",
    null,
    undefined,
  ])("falls back for unsafe value %s", (value) => {
    expect(safeNext(value)).toBe("/dashboard");
  });
});
