import { z } from "zod";

import { allSectionTypes } from "@/lib/sites/defaults";
import { templateIds } from "@/lib/validation/site-theme";

const sectionType = z
  .enum(allSectionTypes as [string, ...string[]])
  .transform((v) => v as (typeof allSectionTypes)[number]);
const siteId = z.uuid();

export const siteNameSchema = z
  .string()
  .trim()
  .min(1, "Give your site a name.")
  .max(80, "Keep the name under 80 characters.");

export const createSiteSchema = z.object({
  name: siteNameSchema,
  kind: z.enum(["portfolio", "business"]),
  template: z.enum(templateIds),
});

/**
 * Work-in-progress section content from the editor. Autosave stores drafts as typed
 * (e.g. a project without a title yet), so this checks shape and size only; the strict
 * per-section schema runs at render time and decides what is shown.
 */
const MAX_CONTENT_BYTES = 50_000;
export const draftContentSchema = z
  .record(z.string().max(40), z.unknown())
  .refine((v) => JSON.stringify(v).length <= MAX_CONTENT_BYTES, "This section is too large.");

export const saveSectionSchema = z.object({
  siteId,
  type: sectionType,
  content: draftContentSchema,
});

export const reorderSchema = z.object({
  siteId,
  order: z.array(sectionType).min(1).max(allSectionTypes.length),
});

export const addSectionSchema = z.object({ siteId, type: sectionType });

export const slugCheckSchema = z.object({ siteId, slug: z.string().trim().max(60) });

export const publishSchema = z.object({
  siteId,
  name: siteNameSchema,
  slug: z.string().trim().max(60),
});
