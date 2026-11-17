import type { RenderableSection } from "@/lib/validation/sections";

import {
  GallerySection,
  PricingSection,
  ProjectsSection,
  ServicesSection,
  TestimonialsSection,
} from "./card-sections";
import { ContactSection, SocialSection } from "./contact-sections";
import { HeroSection } from "./hero";
import { AboutSection, FaqSection, SkillsSection } from "./text-sections";
import { EducationSection, ExperienceSection } from "./timeline-sections";

export { sectionTitles } from "./section-shell";

/**
 * Renders one already-planned (parsed, non-empty) section. `index` is the visible
 * position among non-hero sections, used for the "01, 02…" labels.
 */
export function SectionView({ section, index }: { section: RenderableSection; index: number }) {
  switch (section.type) {
    case "hero":
      return <HeroSection content={section.content} />;
    case "about":
      return <AboutSection content={section.content} index={index} />;
    case "skills":
      return <SkillsSection content={section.content} index={index} />;
    case "experience":
      return <ExperienceSection content={section.content} index={index} />;
    case "education":
      return <EducationSection content={section.content} index={index} />;
    case "projects":
      return <ProjectsSection content={section.content} index={index} />;
    case "services":
      return <ServicesSection content={section.content} index={index} />;
    case "pricing":
      return <PricingSection content={section.content} index={index} />;
    case "testimonials":
      return <TestimonialsSection content={section.content} index={index} />;
    case "gallery":
      return <GallerySection content={section.content} index={index} />;
    case "faq":
      return <FaqSection content={section.content} index={index} />;
    case "contact":
      return <ContactSection content={section.content} index={index} />;
    case "social":
      return <SocialSection content={section.content} index={index} />;
  }
}
