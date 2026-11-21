/**
 * Grounding check for numbers: every number in an owner-fact answer must appear in one
 * of the facts it cites. Catches invented prices, dates and counts. Commas, spaces and
 * currency symbols inside numbers are normalised ("₹2,500" == "2500").
 */
export function extractNumbers(text: string): string[] {
  const matches = text.match(/\d[\d,.\s]*\d|\d/g) ?? [];
  return matches
    .map((m) => m.replace(/[,\s]/g, "").replace(/\.$/, ""))
    .map((m) => m.replace(/\.0+$/, ""))
    .filter(Boolean);
}

export function numbersAreGrounded(answer: string, factTexts: string[]): boolean {
  const allowed = new Set(factTexts.flatMap(extractNumbers));
  return extractNumbers(answer).every((n) => allowed.has(n));
}
