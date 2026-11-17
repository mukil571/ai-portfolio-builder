import { z } from "zod";

export const templateIds = ["minimal-mono"] as const;
export type TemplateId = (typeof templateIds)[number];

/** Owner customization stored in sites.theme (accent/mode now; fonts etc. in Phase 7). */
export const siteThemeSchema = z.object({
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color like #2f6feb.")
    .optional()
    .catch(undefined),
  defaultMode: z.enum(["light", "dark"]).optional().catch(undefined),
});

export const siteSeoSchema = z.object({
  title: z.string().trim().max(70).optional().catch(undefined),
  description: z.string().trim().max(200).optional().catch(undefined),
});

export type SiteTheme = z.output<typeof siteThemeSchema>;
export type SiteSeo = z.output<typeof siteSeoSchema>;
