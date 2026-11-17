import type { SectionType } from "@/lib/validation/sections";

import type { StoredSection } from "./render-plan";

/**
 * Fictional sample portfolio. Used by the template preview (/templates/[id]) and the
 * opt-in production seed (scripts/seed-demo.mjs mirrors this data; keep them in sync).
 * Gallery, services, pricing, testimonials are left EMPTY on purpose: they must not render.
 */
export const sampleSite = {
  name: "Alex Rivera",
  kind: "portfolio" as const,
  template: "minimal-mono" as const,
  theme: { accent: "#2f6feb", defaultMode: "light" as const },
  seo: {
    title: "Alex Rivera — Product engineer",
    description: "Product engineer building calm, fast web apps with React and TypeScript.",
  },
};

const content: Record<SectionType, unknown> = {
  hero: {
    name: "Alex Rivera",
    headline: "Product engineer for calm, fast web apps.",
    subheadline:
      "I design and build React and TypeScript products end to end, from first sketch to production, for small teams that care about the details.",
    location: "Lisbon, Portugal · Remote",
    ctaLabel: "Get in touch",
    ctaUrl: "#contact",
  },
  about: {
    body: "I've spent eight years shipping web products at startups and agencies. I like small teams, short feedback loops and interfaces that feel obvious.\n\nLately I've been focused on design systems, accessibility and making AI features that people can actually trust.",
  },
  skills: {
    groups: [
      {
        name: "Frontend",
        items: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"],
      },
      { name: "Backend", items: ["Node.js", "PostgreSQL", "Drizzle", "tRPC"] },
      { name: "Practice", items: ["Design systems", "Accessibility", "Performance", "Testing"] },
    ],
  },
  experience: {
    items: [
      {
        role: "Senior Product Engineer",
        company: "Northwind Studio",
        startDate: "2022",
        endDate: "Present",
        summary: "Lead engineer on client products for fintech and health startups.",
        highlights: [
          "Built a shared design system used across 6 client apps",
          "Cut median page load from 3.1s to 1.2s on the flagship product",
        ],
      },
      {
        role: "Frontend Engineer",
        company: "Parcel & Co",
        startDate: "2019",
        endDate: "2022",
        summary: "Owned the merchant dashboard used by 4,000 small businesses.",
        highlights: ["Shipped real-time order tracking", "Led the migration to TypeScript"],
      },
    ],
  },
  education: {
    items: [
      {
        school: "University of Porto",
        degree: "BSc",
        field: "Computer Science",
        startDate: "2013",
        endDate: "2016",
      },
    ],
  },
  projects: {
    items: [
      {
        title: "Tidewater",
        description: "A tide and swell planner for surfers with offline maps and a 7-day forecast.",
        tags: ["Next.js", "Mapbox", "PWA"],
        url: "https://example.com/tidewater",
      },
      {
        title: "Ledgerlight",
        description: "Open-source budgeting app that keeps every transaction on your device.",
        tags: ["React", "IndexedDB", "Open source"],
        repoUrl: "https://example.com/ledgerlight",
      },
      {
        title: "Quietform",
        description: "Accessible form builder that scores every form against WCAG 2.2.",
        tags: ["TypeScript", "a11y"],
        url: "https://example.com/quietform",
      },
      {
        title: "Shelf",
        description: "A reading tracker with a reading-speed estimate and yearly recap.",
        tags: ["React Native", "SQLite"],
      },
    ],
  },
  faq: {
    items: [
      {
        question: "Are you available for freelance work?",
        answer: "Yes, for projects starting next quarter. Use the contact section to say hello.",
      },
      {
        question: "Do you work with designers or design myself?",
        answer:
          "Both. I'm happy to work from a designer's files or take a product from sketch to launch.",
      },
    ],
  },
  contact: {
    body: "Have a product in mind? I reply within two working days.",
    email: "hello@example.com",
    location: "Lisbon, Portugal",
  },
  social: {
    links: [
      { platform: "github", url: "https://github.com/example" },
      { platform: "linkedin", url: "https://www.linkedin.com/in/example" },
      { platform: "website", url: "https://example.com", label: "Blog" },
    ],
  },
  // Intentionally empty: omitted from the rendered page.
  services: { items: [] },
  pricing: { items: [] },
  testimonials: { items: [] },
  gallery: { items: [] },
};

const order: SectionType[] = [
  "hero",
  "about",
  "projects",
  "experience",
  "skills",
  "education",
  "services",
  "pricing",
  "testimonials",
  "gallery",
  "faq",
  "contact",
  "social",
];

export const sampleSections: StoredSection[] = order.map((type, position) => ({
  type,
  position,
  content: content[type],
  isVisible: true,
}));
