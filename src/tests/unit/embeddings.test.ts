import { beforeEach, describe, expect, it, vi } from "vitest";

// embeddings.ts is server-only; neutralize the guard for unit tests.
vi.mock("server-only", () => ({}));

const aiEmbed = vi.fn();
vi.mock("ai", () => ({ embed: (args: unknown) => aiEmbed(args) }));

const embeddingModel = vi.fn((id: string) => ({ id }));
vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: () => ({ embeddingModel }),
}));

const env: { GOOGLE_GENERATIVE_AI_API_KEY?: string } = {};
vi.mock("@/env", () => ({ getEnv: () => env }));

const { embed, EmbeddingUnavailableError } = await import("@/lib/knowledge/embeddings");
const { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } = await import("@/lib/knowledge/embedding-config");

const fakeVector = (n: number) => Array.from({ length: n }, (_, i) => (i % 7) - 3);

describe("embed", () => {
  beforeEach(() => {
    aiEmbed.mockReset();
    env.GOOGLE_GENERATIVE_AI_API_KEY = "test-key";
  });

  it.each([
    ["fact", "RETRIEVAL_DOCUMENT"],
    ["query", "RETRIEVAL_QUERY"],
    ["question", "SEMANTIC_SIMILARITY"],
  ] as const)("sends 768 dims and the %s task type (%s)", async (purpose, taskType) => {
    aiEmbed.mockResolvedValue({ embedding: fakeVector(768) });

    await embed("What is your hourly rate?", purpose);

    expect(embeddingModel).toHaveBeenCalledWith(EMBEDDING_MODEL);
    expect(aiEmbed).toHaveBeenCalledWith(
      expect.objectContaining({
        value: "What is your hourly rate?",
        providerOptions: { google: { outputDimensionality: 768, taskType } },
      }),
    );
  });

  it("returns a unit-length vector tagged with the model", async () => {
    aiEmbed.mockResolvedValue({ embedding: fakeVector(EMBEDDING_DIMENSIONS) });

    const result = await embed("hello", "fact");

    const norm = Math.hypot(...result.vector);
    expect(norm).toBeCloseTo(1, 10);
    expect(result.vector).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(result.model).toBe(EMBEDDING_MODEL);
  });

  it("rejects a vector with the wrong dimension", async () => {
    aiEmbed.mockResolvedValue({ embedding: fakeVector(3072) });
    await expect(embed("hello", "fact")).rejects.toThrow(/3072 dimensions; expected 768/);
  });

  it("fails clearly when the platform key is missing", async () => {
    delete env.GOOGLE_GENERATIVE_AI_API_KEY;
    await expect(embed("hello", "fact")).rejects.toBeInstanceOf(EmbeddingUnavailableError);
    expect(aiEmbed).not.toHaveBeenCalled();
  });
});
