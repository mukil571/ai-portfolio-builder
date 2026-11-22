import type { SectionType } from "@/lib/validation/sections";

import type { StoredSection } from "./render-plan";

/**
 * Fictional sample business for template previews of business templates. Fills the
 * business sections (services, pricing, testimonials) and leaves portfolio-only sections
 * empty, so previews show what a real business site looks like.
 */
export const sampleBusinessSite = {
  name: "Kestrel Studio",
  kind: "business" as const,
  seo: {
    title: "Kestrel Studio — Websites for small businesses",
    description: "Fast, friendly websites for local businesses, delivered in three weeks.",
  },
};

const content: Partial<Record<SectionType, unknown>> = {
  hero: {
    name: "Kestrel Studio",
    headline: "Websites that bring local customers through your door.",
    subheadline:
      "We design, build and look after fast, friendly websites for small businesses, so you can get back to running yours.",
    location: "Bristol, UK · Working worldwide",
    ctaLabel: "Book a free call",
    ctaUrl: "#contact",
  },
  about: {
    heading: "A small studio that sweats the details",
    body: "We're a team of four designers and developers who have launched more than 120 sites for cafés, clinics, trades and shops.\n\nEvery project gets a real person you can call, a clear fixed price, and a site you can update yourself.",
  },
  services: {
    items: [
      {
        title: "Website design",
        description: "A custom design that fits your brand and works beautifully on phones.",
        price: "from £1,200",
      },
      {
        title: "Online booking",
        description: "Let customers book appointments or tables straight from your site.",
        price: "from £400",
      },
      {
        title: "Local SEO",
        description: "Show up when people nearby search for what you do.",
        price: "£150 / month",
      },
      {
        title: "Care plan",
        description: "Hosting, updates, backups and small edits, handled for you.",
        price: "£49 / month",
      },
    ],
  },
  pricing: {
    items: [
      {
        name: "Starter",
        price: "£1,200",
        description: "A polished one-page site.",
        features: ["Up to 5 sections", "Mobile friendly", "Contact form"],
      },
      {
        name: "Business",
        price: "£2,400",
        description: "Our most popular package.",
        features: ["Up to 8 pages", "Online booking", "Local SEO setup", "Training session"],
        highlighted: true,
      },
      {
        name: "Care",
        price: "£49",
        period: "month",
        description: "Keep your site fast and safe.",
        features: ["Hosting and backups", "Security updates", "30 min of edits monthly"],
      },
    ],
  },
  testimonials: {
    items: [
      {
        quote:
          "Bookings went up 40% in the first two months. They explained everything in plain English.",
        author: "Priya Shah",
        role: "Owner, Shah Physio",
      },
      {
        quote: "Fast, friendly and on budget. Our new site finally looks like the café we run.",
        author: "Tom Hughes",
        role: "Co-founder, Ferry Lane Coffee",
      },
    ],
  },
  faq: {
    items: [
      {
        question: "How long does a website take?",
        answer: "Most sites launch in about three weeks from our first call.",
      },
      {
        question: "Can I update the site myself?",
        answer: "Yes. Every site comes with a short training session and simple editing.",
      },
      {
        question: "Do you work outside Bristol?",
        answer: "Yes, we work with businesses all over the UK and abroad, mostly over video calls.",
      },
    ],
  },
  contact: {
    heading: "Let's talk about your business",
    body: "Tell us a little about what you do. We reply within one working day.",
    email: "hello@example.com",
    phone: "+44 117 496 0000",
    location: "Bristol, UK",
  },
  social: {
    links: [
      { platform: "instagram", url: "https://instagram.com/example" },
      { platform: "linkedin", url: "https://www.linkedin.com/company/example" },
    ],
  },
};

const order: SectionType[] = [
  "hero",
  "about",
  "services",
  "pricing",
  "testimonials",
  "faq",
  "contact",
  "social",
];

export const sampleBusinessSections: StoredSection[] = order.map((type, position) => ({
  type,
  position,
  content: content[type] ?? {},
  isVisible: true,
}));
