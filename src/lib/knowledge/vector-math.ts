/** Scales a vector to unit length. Throws on an all-zero vector (no direction to keep). */
export function l2Normalize(vector: readonly number[]): number[] {
  let sumSquares = 0;
  for (const x of vector) sumSquares += x * x;
  const norm = Math.sqrt(sumSquares);
  if (norm === 0 || !Number.isFinite(norm)) {
    throw new Error("Cannot normalize a zero or non-finite vector.");
  }
  return vector.map((x) => x / norm);
}
