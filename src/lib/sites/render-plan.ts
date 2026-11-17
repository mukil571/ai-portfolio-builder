import {
  isSectionEmpty,
  parseSection,
  type RenderableSection,
  type SectionType,
} from "@/lib/validation/sections";

export type StoredSection = {
  type: SectionType;
  position: number;
  content: unknown;
  isVisible: boolean;
};

/**
 * Turns stored sections into the ordered list to render:
 * sorted by position, hidden ones skipped, invalid ones skipped, EMPTY ones omitted
 * (no placeholders, per CLAUDE.md §3).
 */
export function planSections(sections: readonly StoredSection[]): RenderableSection[] {
  return [...sections]
    .sort((a, b) => a.position - b.position)
    .flatMap((section) => {
      if (!section.isVisible) return [];
      const parsed = parseSection(section.type, section.content);
      return parsed && !isSectionEmpty(parsed) ? [parsed] : [];
    });
}
