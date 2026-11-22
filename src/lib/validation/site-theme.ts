import { z } from "zod";

export const templateIds = [
  "minimal-mono",
  "bento",
  "dark-dev",
  "editorial",
  "saas-launch",
  "studio",
  "local-pro",
  "product-spotlight",
] as const;
export type TemplateId = (typeof templateIds)[number];

/** Curated heading/body font pairs (loaded in components/templates/fonts.ts). */
export const fontPairIds = ["geist", "grotesk", "serif", "classic", "mono", "friendly"] as const;
export type FontPairId = (typeof fontPairIds)[number];

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color like #2f6feb.");

/**
 * Owner customization stored in sites.theme. Every field is optional: unset fields fall
 * back to the template's defaults, so switching templates adopts the new look unless the
 * owner chose something. Invalid stored values are dropped, never fatal.
 */
export const siteThemeSchema = z.object({
  accent: hexColor.optional().catch(undefined),
  fontPair: z.enum(fontPairIds).optional().catch(undefined),
  defaultMode: z.enum(["light", "dark"]).optional().catch(undefined),
});

export const siteSeoSchema = z.object({
  title: z.string().trim().max(70).optional().catch(undefined),
  description: z.string().trim().max(200).optional().catch(undefined),
});

export type SiteTheme = z.output<typeof siteThemeSchema>;
export type SiteSeo = z.output<typeof siteSeoSchema>;

/** Design panel input (strict: bad values are rejected with a message, not dropped). */
export const designInputSchema = z.object({
  siteId: z.uuid(),
  template: z.enum(templateIds),
  accent: z.union([z.literal(""), hexColor]).transform((v) => v || undefined),
  fontPair: z.union([z.literal(""), z.enum(fontPairIds)]).transform((v) => v || undefined),
  defaultMode: z.union([z.literal(""), z.enum(["light", "dark"])]).transform((v) => v || undefined),
  seoTitle: z.string().trim().max(70, "Keep the title under 70 characters."),
  seoDescription: z.string().trim().max(200, "Keep the description under 200 characters."),
});
export type DesignInput = z.input<typeof designInputSchema>;
