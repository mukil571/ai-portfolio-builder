import { socialPlatforms, type SectionType } from "@/lib/validation/sections";

import { sectionTitles } from "./section-titles";

/** Declarative form description per section type; one generic editor renders all of them. */
export type Field =
  | {
      kind: "text" | "textarea" | "url" | "email";
      name: string;
      label: string;
      placeholder?: string;
      hint?: string;
      max: number;
    }
  | { kind: "image"; name: string; label: string; altField?: string }
  | { kind: "tags"; name: string; label: string; placeholder?: string }
  | { kind: "lines"; name: string; label: string; hint?: string }
  | { kind: "checkbox"; name: string; label: string }
  | { kind: "select"; name: string; label: string; options: { value: string; label: string }[] }
  | {
      kind: "list";
      name: string;
      label: string;
      itemLabel: string;
      titleField: string;
      max: number;
      fields: Field[];
    };

export type SectionForm = { title: string; description: string; fields: Field[] };

const t = (name: string, label: string, max = 120, placeholder?: string): Field => ({
  kind: "text",
  name,
  label,
  max,
  placeholder,
});
const area = (name: string, label: string, max = 2000, hint?: string): Field => ({
  kind: "textarea",
  name,
  label,
  max,
  hint,
});
const link = (name: string, label: string, placeholder = "https://…"): Field => ({
  kind: "url",
  name,
  label,
  max: 2048,
  placeholder,
  hint: "https://, mailto:, tel: or #section links",
});

const dates: Field[] = [t("startDate", "Start", 20, "2022"), t("endDate", "End", 20, "Present")];

export const sectionForms: Record<SectionType, SectionForm> = {
  hero: {
    title: sectionTitles.hero,
    description: "The first thing visitors see.",
    fields: [
      t("name", "Your name or business name", 120, "Jane Doe"),
      t("headline", "Headline", 200, "Product designer for calm, useful apps."),
      area("subheadline", "Intro", 400),
      t("location", "Location", 120, "Lisbon · Remote"),
      { kind: "image", name: "imageUrl", label: "Photo or logo" },
      t("ctaLabel", "Button label", 40, "Get in touch"),
      link("ctaUrl", "Button link", "#contact"),
    ],
  },
  about: {
    title: sectionTitles.about,
    description: "A few short paragraphs. Leave a blank line between paragraphs.",
    fields: [t("heading", "Heading (optional)"), area("body", "About you")],
  },
  skills: {
    title: sectionTitles.skills,
    description: "Group your skills, e.g. Frontend, Backend, Tools.",
    fields: [
      t("heading", "Heading (optional)"),
      {
        kind: "list",
        name: "groups",
        label: "Skill groups",
        itemLabel: "group",
        titleField: "name",
        max: 12,
        fields: [
          t("name", "Group name", 60),
          {
            kind: "tags",
            name: "items",
            label: "Skills",
            placeholder: "Type a skill, press Enter",
          },
        ],
      },
    ],
  },
  experience: {
    title: sectionTitles.experience,
    description: "Your roles, newest first.",
    fields: [
      {
        kind: "list",
        name: "items",
        label: "Roles",
        itemLabel: "role",
        titleField: "role",
        max: 50,
        fields: [
          t("role", "Role"),
          t("company", "Company"),
          t("location", "Location"),
          ...dates,
          area("summary", "Summary"),
          { kind: "lines", name: "highlights", label: "Highlights", hint: "One per line" },
        ],
      },
    ],
  },
  education: {
    title: sectionTitles.education,
    description: "Schools, degrees and courses.",
    fields: [
      {
        kind: "list",
        name: "items",
        label: "Education",
        itemLabel: "school",
        titleField: "school",
        max: 50,
        fields: [
          t("school", "School"),
          t("degree", "Degree"),
          t("field", "Field of study"),
          ...dates,
          area("summary", "Notes"),
        ],
      },
    ],
  },
  projects: {
    title: sectionTitles.projects,
    description: "Your best work. A title is required for a project to show.",
    fields: [
      {
        kind: "list",
        name: "items",
        label: "Projects",
        itemLabel: "project",
        titleField: "title",
        max: 50,
        fields: [
          t("title", "Title"),
          area("description", "Description"),
          { kind: "tags", name: "tags", label: "Tags", placeholder: "React, Figma…" },
          link("url", "Project link"),
          link("repoUrl", "Source code link"),
          { kind: "image", name: "imageUrl", label: "Image", altField: "imageAlt" },
          t("imageAlt", "Image description (for screen readers)", 200),
        ],
      },
    ],
  },
  services: {
    title: sectionTitles.services,
    description: "What you offer.",
    fields: [
      {
        kind: "list",
        name: "items",
        label: "Services",
        itemLabel: "service",
        titleField: "title",
        max: 50,
        fields: [
          t("title", "Service"),
          area("description", "Description"),
          t("price", "Price (optional)", 60, "From $500"),
        ],
      },
    ],
  },
  pricing: {
    title: sectionTitles.pricing,
    description: "Up to 6 plans or packages.",
    fields: [
      {
        kind: "list",
        name: "items",
        label: "Plans",
        itemLabel: "plan",
        titleField: "name",
        max: 6,
        fields: [
          t("name", "Plan name", 60),
          t("price", "Price", 40, "$29"),
          t("period", "Per", 30, "month"),
          area("description", "Description", 400),
          { kind: "lines", name: "features", label: "Features", hint: "One per line" },
          { kind: "checkbox", name: "highlighted", label: "Highlight this plan" },
        ],
      },
    ],
  },
  testimonials: {
    title: sectionTitles.testimonials,
    description: "Real quotes from clients or colleagues.",
    fields: [
      {
        kind: "list",
        name: "items",
        label: "Testimonials",
        itemLabel: "testimonial",
        titleField: "author",
        max: 50,
        fields: [
          area("quote", "Quote", 800),
          t("author", "Name", 80),
          t("role", "Role or company"),
        ],
      },
    ],
  },
  gallery: {
    title: sectionTitles.gallery,
    description: "Photos of your work or space. Each image needs a description.",
    fields: [
      {
        kind: "list",
        name: "items",
        label: "Images",
        itemLabel: "image",
        titleField: "alt",
        max: 24,
        fields: [
          { kind: "image", name: "imageUrl", label: "Image", altField: "alt" },
          t("alt", "Image description (required)", 200),
          t("caption", "Caption", 200),
        ],
      },
    ],
  },
  faq: {
    title: sectionTitles.faq,
    description: "Questions visitors often ask.",
    fields: [
      {
        kind: "list",
        name: "items",
        label: "Questions",
        itemLabel: "question",
        titleField: "question",
        max: 50,
        fields: [t("question", "Question", 300), area("answer", "Answer")],
      },
    ],
  },
  contact: {
    title: sectionTitles.contact,
    description: "How people can reach you. Add at least an email, phone or message.",
    fields: [
      t("heading", "Heading (optional)"),
      area("body", "Message"),
      { kind: "email", name: "email", label: "Email", max: 254, placeholder: "you@example.com" },
      t("phone", "Phone", 40),
      t("location", "Location"),
    ],
  },
  social: {
    title: sectionTitles.social,
    description: "Links to your profiles.",
    fields: [
      {
        kind: "list",
        name: "links",
        label: "Links",
        itemLabel: "link",
        titleField: "platform",
        max: 12,
        fields: [
          {
            kind: "select",
            name: "platform",
            label: "Platform",
            options: socialPlatforms.map((p) => ({
              value: p,
              label: p === "x" ? "X" : p[0]!.toUpperCase() + p.slice(1),
            })),
          },
          link("url", "URL"),
          t("label", "Label (optional)", 40),
        ],
      },
    ],
  },
};
