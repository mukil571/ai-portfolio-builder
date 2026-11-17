import { z } from "zod";

/*
 * Content schemas for every site section type. Used when writing (wizard / editor)
 * and when rendering. Design rules:
 * - Blank strings are treated as missing, so an untouched field never renders.
 * - Invalid list items are DROPPED (lenient lists) instead of failing the whole
 *   section, so one bad project can't hide the others.
 * - Links only allow http(s), mailto:, tel: and in-page #anchors (no javascript:).
 */

const MAX_SHORT = 120;
const MAX_TEXT = 2000;
const MAX_ITEMS = 50;

/** Optional trimmed string; "" / whitespace -> undefined. */
const text = (max = MAX_SHORT) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.string().max(max).optional(),
  );

/** Required non-blank trimmed string. */
const required = (max = MAX_SHORT) => z.string().trim().min(1).max(max);

const SAFE_LINK = /^(https?:\/\/|mailto:|tel:|#)/i;
const link = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : v),
  z
    .string()
    .max(2048)
    .refine((v) => SAFE_LINK.test(v), "Use an https://, mailto:, tel: or #section link.")
    .optional(),
);

const imageUrl = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : v),
  z
    .url({ protocol: /^https?$/ })
    .max(2048)
    .optional(),
);

/** Array whose invalid entries are silently dropped (and blank strings removed). */
function lenientList<T extends z.ZodType>(item: T, max = MAX_ITEMS) {
  return z.preprocess(
    (v) => (Array.isArray(v) ? v : []),
    z.array(z.unknown()).transform((items) =>
      items
        .flatMap((raw) => {
          const parsed = item.safeParse(raw);
          return parsed.success ? [parsed.data as z.output<T>] : [];
        })
        .slice(0, max),
    ),
  );
}

const tagList = lenientList(required(40), 20);

export const heroSchema = z.object({
  name: text(),
  headline: text(200),
  subheadline: text(400),
  location: text(),
  imageUrl,
  ctaLabel: text(40),
  ctaUrl: link,
});

export const aboutSchema = z.object({ heading: text(), body: text(MAX_TEXT) });

export const skillsSchema = z.object({
  heading: text(),
  groups: lenientList(
    z
      .object({ name: text(60), items: lenientList(required(60), 40) })
      .refine((g) => g.items.length > 0),
    12,
  ),
});

const dated = { startDate: text(20), endDate: text(20) };

export const experienceSchema = z.object({
  items: lenientList(
    z.object({
      role: required(),
      company: required(),
      location: text(),
      ...dated,
      summary: text(MAX_TEXT),
      highlights: lenientList(required(300), 10),
    }),
  ),
});

export const educationSchema = z.object({
  items: lenientList(
    z.object({
      school: required(),
      degree: text(),
      field: text(),
      ...dated,
      summary: text(MAX_TEXT),
    }),
  ),
});

export const projectsSchema = z.object({
  items: lenientList(
    z.object({
      title: required(),
      description: text(MAX_TEXT),
      url: link,
      repoUrl: link,
      imageUrl,
      imageAlt: text(200),
      tags: tagList,
    }),
  ),
});

export const servicesSchema = z.object({
  items: lenientList(z.object({ title: required(), description: text(MAX_TEXT), price: text(60) })),
});

export const pricingSchema = z.object({
  items: lenientList(
    z.object({
      name: required(60),
      price: required(40),
      period: text(30),
      description: text(400),
      features: lenientList(required(200), 15),
      highlighted: z.boolean().optional(),
    }),
    6,
  ),
});

export const testimonialsSchema = z.object({
  items: lenientList(z.object({ quote: required(800), author: required(80), role: text(120) })),
});

export const gallerySchema = z.object({
  items: lenientList(
    // Alt text is required so every image is accessible.
    z.object({ imageUrl: z.url({ protocol: /^https?$/ }), alt: required(200), caption: text(200) }),
    24,
  ),
});

export const faqSchema = z.object({
  items: lenientList(z.object({ question: required(300), answer: required(MAX_TEXT) })),
});

export const contactSchema = z.object({
  heading: text(),
  body: text(MAX_TEXT),
  email: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.email().max(254).optional(),
  ),
  phone: text(40),
  location: text(),
});

export const socialPlatforms = [
  "github",
  "linkedin",
  "x",
  "instagram",
  "youtube",
  "dribbble",
  "behance",
  "website",
  "email",
  "other",
] as const;

export const socialSchema = z.object({
  links: lenientList(
    z.object({ platform: z.enum(socialPlatforms), url: link.pipe(z.string()), label: text(40) }),
    12,
  ),
});

export const sectionSchemas = {
  hero: heroSchema,
  about: aboutSchema,
  skills: skillsSchema,
  experience: experienceSchema,
  education: educationSchema,
  projects: projectsSchema,
  services: servicesSchema,
  pricing: pricingSchema,
  testimonials: testimonialsSchema,
  gallery: gallerySchema,
  faq: faqSchema,
  contact: contactSchema,
  social: socialSchema,
} as const;

export type SectionType = keyof typeof sectionSchemas;
export type SectionContent<T extends SectionType = SectionType> = z.output<
  (typeof sectionSchemas)[T]
>;

/** A parsed, non-empty section ready to render (discriminated by `type`). */
export type RenderableSection = {
  [T in SectionType]: { type: T; content: SectionContent<T> };
}[SectionType];

/** True when a parsed section has nothing worth rendering. */
export function isSectionEmpty(section: RenderableSection): boolean {
  switch (section.type) {
    case "hero":
      return !section.content.name && !section.content.headline;
    case "about":
      return !section.content.body;
    case "skills":
      return section.content.groups.length === 0;
    case "contact":
      return !section.content.email && !section.content.phone && !section.content.body;
    case "social":
      return section.content.links.length === 0;
    default:
      return section.content.items.length === 0;
  }
}

/** Parses raw stored content for `type`; returns null if it isn't valid. */
export function parseSection(type: SectionType, content: unknown): RenderableSection | null {
  const result = sectionSchemas[type].safeParse(content ?? {});
  return result.success ? ({ type, content: result.data } as RenderableSection) : null;
}
