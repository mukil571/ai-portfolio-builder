import type { FontPairId, SiteTheme, TemplateId } from "@/lib/validation/site-theme";

export type TemplateMeta = {
  id: TemplateId;
  name: string;
  kind: "portfolio" | "business";
  description: string;
  fontPair: FontPairId;
  accent: string;
  mode: "light" | "dark";
  /** Mini swatch for pickers (bg, fg, card) in the default mode. */
  swatch: { bg: string; fg: string; card: string };
};

/** Every template, in picker order. Templates are themes over the same sections. */
export const templates: TemplateMeta[] = [
  {
    id: "minimal-mono",
    name: "Minimal Mono",
    kind: "portfolio",
    description: "Clean, monochrome, numbered sections",
    fontPair: "geist",
    accent: "#2f6feb",
    mode: "light",
    swatch: { bg: "#fafaf9", fg: "#18181b", card: "#ffffff" },
  },
  {
    id: "bento",
    name: "Bento",
    kind: "portfolio",
    description: "Everything in a tidy grid of rounded tiles",
    fontPair: "friendly",
    accent: "#7c3aed",
    mode: "light",
    swatch: { bg: "#ececef", fg: "#18181b", card: "#ffffff" },
  },
  {
    id: "dark-dev",
    name: "Dark Dev",
    kind: "portfolio",
    description: "Terminal-flavoured dark theme for developers",
    fontPair: "mono",
    accent: "#3fb950",
    mode: "dark",
    swatch: { bg: "#0d1117", fg: "#e6edf3", card: "#161b22" },
  },
  {
    id: "editorial",
    name: "Editorial",
    kind: "portfolio",
    description: "Magazine-style serif headlines on warm paper",
    fontPair: "serif",
    accent: "#b45309",
    mode: "light",
    swatch: { bg: "#fbf8f3", fg: "#1c1917", card: "#fffdf9" },
  },
  {
    id: "saas-launch",
    name: "SaaS Launch",
    kind: "business",
    description: "Centered launch page with a glowing hero",
    fontPair: "grotesk",
    accent: "#7c83ff",
    mode: "dark",
    swatch: { bg: "#07070d", fg: "#f4f4f7", card: "#11111c" },
  },
  {
    id: "studio",
    name: "Studio",
    kind: "business",
    description: "Bold oversized type for agencies and creatives",
    fontPair: "classic",
    accent: "#e11d48",
    mode: "light",
    swatch: { bg: "#ffffff", fg: "#0a0a0a", card: "#f4f4f4" },
  },
  {
    id: "local-pro",
    name: "Local Pro",
    kind: "business",
    description: "Warm and trustworthy for local services",
    fontPair: "serif",
    accent: "#0f766e",
    mode: "light",
    swatch: { bg: "#fffcf7", fg: "#1f2a2a", card: "#ffffff" },
  },
  {
    id: "product-spotlight",
    name: "Product Spotlight",
    kind: "business",
    description: "One product, big showcase image, dark stage",
    fontPair: "geist",
    accent: "#f97316",
    mode: "dark",
    swatch: { bg: "#0b0b0c", fg: "#f5f5f4", card: "#161616" },
  },
];

export function templateMeta(id: TemplateId): TemplateMeta {
  return templates.find((t) => t.id === id) ?? templates[0]!;
}

export const fontPairs: Record<
  FontPairId,
  { label: string; heading: string; body: string; headingVar: string }
> = {
  geist: { label: "Geist", heading: "Geist", body: "Geist", headingVar: "--font-geist-sans" },
  grotesk: {
    label: "Space Grotesk + Inter",
    heading: "Space Grotesk",
    body: "Inter",
    headingVar: "--font-space-grotesk",
  },
  serif: {
    label: "Fraunces + Inter",
    heading: "Fraunces",
    body: "Inter",
    headingVar: "--font-fraunces",
  },
  classic: {
    label: "Playfair Display + Source Sans",
    heading: "Playfair Display",
    body: "Source Sans 3",
    headingVar: "--font-playfair",
  },
  mono: {
    label: "JetBrains Mono + Geist",
    heading: "JetBrains Mono",
    body: "Geist",
    headingVar: "--font-jetbrains",
  },
  friendly: { label: "Manrope", heading: "Manrope", body: "Manrope", headingVar: "--font-manrope" },
};

/** The look actually rendered: owner choices over template defaults. */
export function resolveTheme(template: TemplateId, theme: SiteTheme) {
  const meta = templateMeta(template);
  const accent = theme.accent ?? meta.accent;
  return {
    accent,
    accentForeground: readableOn(accent),
    fontPair: theme.fontPair ?? meta.fontPair,
    mode: theme.defaultMode ?? meta.mode,
  };
}

/** Black or white, whichever contrasts more with `hex` (always >= 4.5:1 for 6-digit hex). */
export function readableOn(hex: string): "#000000" | "#ffffff" {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? "#000000" : "#ffffff";
}
