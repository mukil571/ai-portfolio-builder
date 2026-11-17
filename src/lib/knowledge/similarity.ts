import { cosineDistance, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * Cosine similarity in SQL: `1 - (column <=> query)`, using pgvector's cosine
 * distance operator `<=>` (the cosine operator class; never `<->` L2 or `<#>` inner
 * product). Range [-1, 1]; higher is more similar.
 *
 * There is deliberately no ANN (HNSW/IVFFlat) index: callers MUST filter by
 * site_id (and status) so Postgres scans one site's rows and computes exact
 * distances. Retrieval and dedup thresholds are tuned against this exact score.
 */
export function cosineSimilarity(column: AnyPgColumn, query: number[]): SQL<number> {
  return sql<number>`1 - (${cosineDistance(column, query)})`;
}
