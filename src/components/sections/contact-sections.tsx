import { Globe, Link2, Mail, MapPin, Phone } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import type { SectionContent } from "@/lib/validation/sections";

import { SectionShell, sectionTitles, SiteLink } from "./section-shell";

export function ContactSection({
  content,
  index,
}: {
  content: SectionContent<"contact">;
  index: number;
}) {
  return (
    <SectionShell id="contact" index={index} title={content.heading ?? sectionTitles.contact}>
      {content.body ? (
        <p className="max-w-2xl text-lg leading-relaxed text-pretty">{content.body}</p>
      ) : null}
      <ul className="mt-6 space-y-3">
        {content.email ? (
          <li>
            <a
              href={`mailto:${content.email}`}
              className="inline-flex items-center gap-2 text-lg font-medium underline decoration-site-accent decoration-2 underline-offset-4"
            >
              <Mail className="size-5" aria-hidden="true" />
              {content.email}
            </a>
          </li>
        ) : null}
        {content.phone ? (
          <li>
            <a
              href={`tel:${content.phone.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-2 text-site-muted hover:text-site-fg"
            >
              <Phone className="size-4" aria-hidden="true" />
              {content.phone}
            </a>
          </li>
        ) : null}
        {content.location ? (
          <li className="inline-flex items-center gap-2 text-site-muted">
            <MapPin className="size-4" aria-hidden="true" />
            {content.location}
          </li>
        ) : null}
      </ul>
    </SectionShell>
  );
}

type Platform = SectionContent<"social">["links"][number]["platform"];

const platformLabels: Record<Platform, string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  x: "X",
  instagram: "Instagram",
  youtube: "YouTube",
  dribbble: "Dribbble",
  behance: "Behance",
  website: "Website",
  email: "Email",
  other: "Link",
};

const platformIcon = (p: Platform): ComponentType<SVGProps<SVGSVGElement>> =>
  p === "email" ? Mail : p === "website" ? Globe : Link2;

export function SocialSection({
  content,
  index,
}: {
  content: SectionContent<"social">;
  index: number;
}) {
  return (
    <SectionShell id="social" index={index} title={sectionTitles.social}>
      <ul className="flex flex-wrap gap-3">
        {content.links.map((l) => {
          const Icon = platformIcon(l.platform);
          return (
            <li key={l.url}>
              <SiteLink
                href={l.url}
                className="site-chip inline-flex items-center gap-2 rounded-lg border border-site-border px-3 py-2 text-sm transition-colors hover:border-site-fg"
              >
                <Icon className="size-4" aria-hidden="true" />
                {l.label ?? platformLabels[l.platform]}
              </SiteLink>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
