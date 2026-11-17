import type { SectionType } from "@/lib/validation/sections";

export type SiteKind = "portfolio" | "business";

/** Sections a new site starts with, in order. Empty ones simply don't render. */
export const defaultSectionsByKind: Record<SiteKind, SectionType[]> = {
  portfolio: [
    "hero",
    "about",
    "projects",
    "experience",
    "skills",
    "education",
    "testimonials",
    "faq",
    "contact",
    "social",
  ],
  business: [
    "hero",
    "about",
    "services",
    "pricing",
    "testimonials",
    "gallery",
    "faq",
    "contact",
    "social",
  ],
};

export const allSectionTypes: SectionType[] = [
  "hero",
  "about",
  "skills",
  "experience",
  "education",
  "projects",
  "services",
  "pricing",
  "testimonials",
  "gallery",
  "faq",
  "contact",
  "social",
];
