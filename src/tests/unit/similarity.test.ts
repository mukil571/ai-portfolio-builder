import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { knowledgeFacts } from "@/lib/db/schema";
import { cosineSimilarity } from "@/lib/knowledge/similarity";
import { l2Normalize } from "@/lib/knowledge/vector-math";

describe("cosineSimilarity", () => {
  it("uses pgvector's cosine distance operator <=>", () => {
    const query = new PgDialect().sqlToQuery(cosineSimilarity(knowledgeFacts.embedding, [1, 0]));
    expect(query.sql).toContain("<=>");
    expect(query.sql).not.toMatch(/<->|<#>/);
    expect(query.sql).toMatch(/^1 - \(/);
  });
});

describe("l2Normalize", () => {
  it("scales to unit length and keeps direction", () => {
    expect(l2Normalize([3, 4])).toEqual([0.6, 0.8]);
  });

  it("throws on a zero vector", () => {
    expect(() => l2Normalize([0, 0])).toThrow();
  });
});
